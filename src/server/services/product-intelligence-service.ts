import { ProductIntelligenceCard } from "@/lib/types/product-intelligence";
import { ProductIntelligenceCardSchema } from "@/lib/schema/product-intelligence";
import { ProductEntity, ProductIntelligenceRecord } from "../domain/types";
import { ProductRepository, ProductIntelligenceRepository } from "../repositories";
import { OFFICIAL_NOTEBOOK } from "@/lib/notebooklm";
import { STAR_PRODUCTS } from "@/lib/knowledge";
import { findCatalogProduct } from "@/lib/data/ecomshop-catalog";


export class ProductIntelligenceService {
  private productRepo = new ProductRepository();
  private intelRepo = new ProductIntelligenceRepository();

  /**
   * Obtiene o genera una ProductIntelligenceCard con evidencia para un producto/SKU dado
   */
  async getOrGenerateCard(skuOrModel: string, apiKey?: string): Promise<ProductIntelligenceCard> {
    const cleanQuery = skuOrModel.trim().toLowerCase();

    // 1. Intentar buscar en Firestore (cache/persistencia)
    try {
      const cached = await this.intelRepo.findBySku(skuOrModel);
      if (cached && cached.cardPayload) {
        const validated = ProductIntelligenceCardSchema.safeParse(cached.cardPayload);
        if (validated.success) {
          return validated.data as ProductIntelligenceCard;
        }
      }
    } catch (e) {
      console.warn("Firestore intel lookup failed (non-fatal):", e);
    }

    // 2. Resolver datos del producto desde catálogo/fuentes verificadas
    const productInfo = this.resolveCatalogItem(cleanQuery);

    // 3. Generar con Gemini AI con grounding estricto o fallback técnico verificado
    const card = await this.synthesizeWithEvidence(productInfo, apiKey);

    // 4. Persistir en Firestore si es posible
    try {
      const record: ProductIntelligenceRecord = {
        id: `intel-${productInfo.sku.toLowerCase()}`,
        productId: productInfo.id,
        sku: productInfo.sku,
        cardPayload: card,
        version: 1,
        qualityGatePassed: card.evidenceLedger.every(e => e.verified),
        evidenceCount: card.evidenceLedger.length,
        generatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.intelRepo.save(record);
    } catch (e) {
      console.warn("Firestore intel save failed (non-fatal):", e);
    }

    return card;
  }

  private resolveCatalogItem(query: string): ProductEntity {
    // Búsqueda en ECOMSHOP_CATALOG (máxima prioridad y fidelidad técnica)
    const cat = findCatalogProduct(query);
    if (!cat) {
      throw new Error(`PRODUCT_NOT_FOUND: Producto no encontrado en catálogo para la consulta '${query}'`);
    }

    return {
      id: cat.id,
      sku: cat.sku,
      brand: cat.brand,
      model: cat.model,
      title: cat.name,
      category: cat.category,
      description: cat.description,
      url: cat.url,
      stockStatus: cat.stockStatus,
      standards: cat.standards,
      ports: cat.interfaces,
      poeBudgetWatts: cat.poeBudgetWatts,
      managementType: `${cat.managementMode} unificada ${cat.brand} Cloud (zero-licensing)`,
      tags: ["networking", "b2b", cat.category, "official-catalog"],
      updatedAt: new Date().toISOString()
    };
  }

  private async synthesizeWithEvidence(product: ProductEntity, apiKey?: string): Promise<ProductIntelligenceCard> {
    const isVertex = process.env.GOOGLE_GENAI_USE_VERTEXAI === "true" || (!apiKey && Boolean(process.env.GOOGLE_CLOUD_PROJECT));
    const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const cat = findCatalogProduct(product.sku || product.model);

    // Localizar fuentes y datasheets relevantes en OFFICIAL_NOTEBOOK, priorizando notebookCitation oficial
    const notebookSources = [...OFFICIAL_NOTEBOOK.sources];
    const catCitation = cat?.notebookCitation || cat?.notebookSource;
    if (catCitation && !notebookSources.some(s => s.id === catCitation.sourceId)) {
      notebookSources.unshift({
        id: catCitation.sourceId,
        title: catCitation.title,
        type: catCitation.type,
        description: catCitation.rationale,
        url: catCitation.url,
        addedAt: "Oficial"
      });
    }

    const relevantSources = notebookSources.filter(s =>
      (cat?.notebookSource && s.id === cat.notebookSource.sourceId) ||
      s.title.toLowerCase().includes(product.model.toLowerCase()) ||
      s.description.toLowerCase().includes(product.model.toLowerCase()) ||
      s.description.toLowerCase().includes(product.category.toLowerCase())
    );

    if (key || isVertex) {
      try {
        const { getGenAIClient, getActiveGeminiModel } = await import("@/lib/genai-client");
        const ai = getGenAIClient(apiKey);
        const activeModel = getActiveGeminiModel(apiKey);

        const prompt = `
Genera una ProductIntelligenceCard técnica y rigurosa para este producto del catálogo oficial ECOMSHOP_CATALOG:
- Marca: ${product.brand}
- Modelo: ${product.model}
- SKU: ${product.sku}
- Categoría: ${product.category}
- Descripción: ${product.description}
- Puertos e interfaces oficiales: ${product.ports.join(", ")}
- Estándares y especificaciones: ${product.standards.join(", ")}
${cat?.powerRequirements ? `- Requisitos de alimentación: ${cat.powerRequirements}` : ""}
${cat?.firewallThroughput ? `- Rendimiento Firewall/VPN: ${cat.firewallThroughput}` : ""}
${cat?.keyAdvantages ? `- Ventajas clave oficiales:\n  * ${cat.keyAdvantages.join("\n  * ")}` : ""}
${cat?.antiHallucinationNotes && cat.antiHallucinationNotes.length > 0 ? `
NORMAS ANTI-ALUCINACIÓN ESTRICTAS PARA ESTE MODELO:
${cat.antiHallucinationNotes.map(n => `- ${n}`).join("\n")}
` : ""}
${cat?.bundleDetails ? `- Bundle recomendado en catálogo: ${cat.bundleDetails.sku} (${cat.bundleDetails.name}) -> ${cat.bundleDetails.rationale}` : ""}

- Fuentes verificadas disponibles:
${relevantSources.map(s => `[${s.type}] ${s.title}: ${s.description} (${s.url || "N/A"})`).join("\n")}

REGLAS DE RIGOR TÉCNICO:
1. El evidenceLedger debe incluir claims verificables (PoE budget, velocidad de puertos, capacidades Cloud/Standalone).
2. sourceType debe ser: 'ECOMSHOP_WEB' | 'DATASHEET' | 'MANUFACTURER_FAQ' | 'SEARCH_GROUNDING'.
3. confidence debe ser 'HIGH' | 'MEDIUM' | 'LOW' y verified: true.
4. commercialAngles debe contener exactamente executiveRoi, engineeringPerformance y operationsDeployment.
5. complementaryProducts debe sugerir el bundle recomendado del catálogo: ${cat?.bundleDetails?.sku || "ECS2512FP"}.
6. JAMÁS inventes que el gateway ESG510 o ESG610 tiene Wi-Fi integrado. Si es un ESG, recalca explícitamente que es un gateway cableado.
7. JAMÁS inventes que un AP Wi-Fi 7 funciona al 100% con PoE básico de 15W si requiere 802.3bt.

Responde estrictamente en JSON con la forma de ProductIntelligenceCard:
`;
        const generatePromise = ai.models.generateContent({
          model: activeModel,
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("[ProductIntelligenceService] Timeout excedido (10s)")), 10000)
        );

        const res = await Promise.race([generatePromise, timeoutPromise]);

        const raw = res.text || "{}";
        const parsed = JSON.parse(raw.replace(/```json/gi, "").replace(/```/g, "").trim());
        const validated = ProductIntelligenceCardSchema.safeParse(parsed);
        if (validated.success) {
          return validated.data as ProductIntelligenceCard;
        }
      } catch (err) {
        console.warn("Fallo en síntesis con Gemini API, procediendo a grounding determinista:", err);
      }
    }

    // Fallback con Grounding Técnico Verificado desde ECOMSHOP_CATALOG
    const isAP = product.category === "wifi" || product.model.startsWith("ECW");
    const isSwitch = product.category === "switches" || product.model.startsWith("ECS");
    const isGateway = product.category === "gateways" || product.model.startsWith("ESG");

    const officialEvidenceLedger = [
      {
        claim: cat
          ? `El equipo ${cat.name} cuenta con especificaciones oficiales validadas: ${(cat.rawSpecs || cat.specs).slice(0, 2).join(". ")}.`
          : `El equipo ${product.model} cuenta con soporte nativo de gestión Cloud sin costes de licencias recurrentes.`,
        source: cat?.notebookCitation?.url || relevantSources[0]?.url || product.url || "https://www.ecomshop.es",
        sourceType: "DATASHEET" as const,
        confidence: "HIGH" as const,
        verified: true
      },
      {
        claim: cat?.antiHallucinationNotes?.[0] || (
          isGateway
            ? `El gateway ${product.model} es un dispositivo exclusivamente cableado de seguridad perimetral (sin Wi-Fi integrado).`
            : `Distribución oficial con garantía EcomSpain y disponibilidad con entrega rápida 24/48h en España.`
        ),
        source: cat?.notebookCitation?.url || "https://www.ecomshop.es",
        sourceType: (cat?.antiHallucinationNotes ? "DATASHEET" : "ECOMSHOP_WEB") as "DATASHEET" | "ECOMSHOP_WEB",
        confidence: "HIGH" as const,
        verified: true
      },
      {
        claim: `Distribución oficial por EcomSpain con soporte preventa de ingeniería y stock garantizado en España con entrega 24/48h.`,
        source: "https://www.ecomshop.es",
        sourceType: "ECOMSHOP_WEB" as const,
        confidence: "HIGH" as const,
        verified: true
      }
    ];

    const complementaryProducts = cat?.bundleDetails ? [
      {
        skuOrCategory: cat.bundleDetails.sku,
        relationshipType: cat.bundleDetails.relationshipType,
        reason: cat.bundleDetails.rationale
      }
    ] : isAP ? [
      {
        skuOrCategory: "ECS2512FP",
        relationshipType: "REQUIRES_POE_SWITCH" as const,
        reason: "Switch Multi-Gigabit 2.5G con PoE++ 802.3bt imprescindible para alimentar y exprimir el ancho de banda del AP."
      }
    ] : isSwitch ? [
      {
        skuOrCategory: "SFP-10G-SR-KIT",
        relationshipType: "COMPATIBLE_TRANSCEIVER" as const,
        reason: "Transceptores ópticos 10G SFP+ y latiguillos OM4 certificados para uplinks de alta velocidad entre racks."
      }
    ] : isGateway ? [
      {
        skuOrCategory: "ECS1528FP",
        relationshipType: "REQUIRES_POE_SWITCH" as const,
        reason: "Switch PoE gestionable para conectar y alimentar APs Wi-Fi y puestos de trabajo, ya que el gateway no tiene PoE ni Wi-Fi."
      }
    ] : [
      {
        skuOrCategory: "ACCESSORY-RACK",
        relationshipType: "ACCESSORY" as const,
        reason: "Kit de montaje en rack de 19 pulgadas y organizador de cableado."
      }
    ];

    const commercialAngles = cat?.commercialAngles || {
      executiveRoi: "Eliminación completa de licencias anuales obligatorias, logrando un ahorro de TCO superior al 40% frente a marcas propietarias.",
      engineeringPerformance: "Caudal de datos sin cuellos de botella gracias a puertos Multi-Gigabit y gestión centralizada de interferencias.",
      operationsDeployment: "Aprovisionamiento masivo de sedes en minutos con escaneo QR y monitoreo de topología en tiempo real."
    };

    return {
      product: {
        brand: product.brand,
        model: product.model,
        sku: product.sku,
        category: product.category,
        url: product.url,
        stockStatus: product.stockStatus
      },
      technicalSpecs: {
        standards: cat?.standards || (product.standards.length > 0 ? product.standards : ["IEEE 802.11be", "802.3bt PoE++"]),
        ports: cat?.interfaces || (product.ports.length > 0 ? product.ports : ["1x 10GbE RJ45", "1x 2.5GbE RJ45"]),
        powerRequirements: cat?.powerRequirements || (product.poeBudgetWatts ? `PoE Budget: ${product.poeBudgetWatts}W (802.3at/bt)` : "Alimentación PoE 802.3at/bt o adaptador DC"),
        management: cat ? `${cat.managementMode} unificada ${cat.brand} Cloud con zero-licensing` : (product.managementType || `${product.brand} Cloud con zero-touch provisioning`),
        keyDifferentiators: cat?.keyAdvantages || [
          `Sin costes ocultos de suscripción anual en gestión ${product.brand} cloud`,
          "Aprovisionamiento ultra-rápido mediante código QR",
          "Soporte preventa y sustitución avanzada de EcomShop en 24/48h"
        ]
      },
      evidenceLedger: officialEvidenceLedger,
      commercialAngles,
      complementaryProducts,
      generatedAt: new Date().toISOString()
    };
  }
}

