import { EditorialAngle, ProductType } from "@/lib/types/editorial-intelligence";
import { StructuredProductIntelligence } from "./notebook-intelligence";

/**
 * Genera de 3 a 5 ángulos editoriales candidatos para un producto y audiencia
 */
export function generateEditorialAngleCandidates(
  sku: string,
  productType: ProductType,
  audience: string,
  intel: StructuredProductIntelligence
): EditorialAngle[] {
  const cleanSku = (sku || intel.sku || "").trim().toUpperCase();
  const model = intel.model || cleanSku;
  const audienceClean = audience.toLowerCase();

  const isInstaller = audienceClean.includes("instalad") || audienceClean.includes("téc");
  const isTicDirector = audienceClean.includes("director") || audienceClean.includes("tic") || audienceClean.includes("sistemas");
  const isPurchasing = audienceClean.includes("compra") || audienceClean.includes("tco");
  const isDistributor = audienceClean.includes("distribuid") || audienceClean.includes("canal") || audienceClean.includes("mayor");

  // ÁNGULOS PARA CABLES DAC O TRANSCEPTORES ÓPTICOS
  if (productType === "DAC" || productType === "OPTICAL_TRANSCEIVER" || productType === "FIBER_CABLE") {
    if (isInstaller) {
      return [
        {
          id: "angle-dac-1",
          title: "Cómo Evitar Errores de Conexión y Retrabajos en Enlaces 10G DENTRO del Rack",
          editorialQuestion: "¿Qué diferencias de montaje y prevención de incidencias existen entre un cable pasivo DAC y módulos ópticos en latiguillos de corta distancia?",
          tension: "facilidad plug-and-play vs fragilidad y limpieza de conectores de fibra",
          readerPromise: "Al terminar, el técnico sabrá cómo evitar fallos de atenuación por polvo y reducir tiempos de despliegue en armarios de distribución.",
          rationale: "Aborda el dolor físico del instalador en campo.",
          relevanceScore: 95
        },
        {
          id: "angle-dac-2",
          title: "Cuándo Elegir DAC Pasivo Frente a Transceptores Ópticos en Armario Rack",
          editorialQuestion: "¿En qué casos exactos un enlace directo de cobre a 10Gbps supera a la fibra óptica en costes de instalación y estabilidad térmica?",
          tension: "coste por puerto y consumo térmico vs tiradas de fibra óptica tradicionales",
          readerPromise: "El profesional podrá decidir al instante la solución física óptima para enlaces intradominio de hasta 3 metros.",
          rationale: "Aporta criterio técnico de selección directa.",
          relevanceScore: 92
        },
        {
          id: "angle-dac-3",
          title: "Verificación de Compatibilidad SFP+ y Mitigación de Ruido EMI en Racks de Alta Densidad",
          editorialQuestion: "¿Cómo influye el apantallamiento electromagnético multinivel en la transmisión de datos a 10 Gbps sin caídas de paquetes?",
          tension: "latencia cero y blindaje metálico vs interferencias en armarios saturados",
          readerPromise: "El integrador comprenderá cómo asegurar la integridad de la señal sin necesitar herramientas de certificación de fibra.",
          rationale: "Aumenta la confianza en la calidad física del medio.",
          relevanceScore: 88
        }
      ];
    } else if (isTicDirector) {
      return [
        {
          id: "angle-dac-tic-1",
          title: "DAC vs Fibra Óptica 10G: La Decisión de Arquitectura y TCO en el Armario Central",
          editorialQuestion: "¿Cómo optimizar la latencia y la eficiencia energética en enlaces de interconexión 10G entre switches de agregación y servidores?",
          tension: "disipación de 1.5W por módulo óptico vs 0.1W por puerto en cobre DAC pasivo",
          readerPromise: "El director de sistemas sabrá cómo reducir la carga térmica del CPD y garantizar latencias inferiores a 0.1 nanosegundos.",
          rationale: "Responde a métricas de eficiencia operativa y arquitectura de sistemas.",
          relevanceScore: 98
        },
        {
          id: "angle-dac-tic-2",
          title: "Diseño de Enlaces Troncales Tronco-Servidor: Prevención de Cuellos de Botella sin Costes Ocultos",
          editorialQuestion: "¿Qué elementos del medio físico determinan la latencia agregada en transferencias masivas de datos?",
          tension: "rendimiento teórico de puerto vs resistencia real del medio físico",
          readerPromise: "Proporciona una guía clara para seleccionar el medio físico 10G sin incurrir en licencias ni sustituciones prematuras.",
          rationale: "Centrado en escalabilidad y continuidad de negocio.",
          relevanceScore: 90
        }
      ];
    } else if (isPurchasing) {
      return [
        {
          id: "angle-dac-buy-1",
          title: "Evaluación de Coste Total (TCO) a 3-5 Años: Enlaces Cobre DAC 10G vs Óptica Tradicional",
          editorialQuestion: "¿Por qué comprar transceptores y latiguillos de fibra para tiradas inferiores a 3 metros triplica innecesariamente el presupuesto del proyecto?",
          tension: "ahorro directo por puerto vs sobrecostes en transceptores ópticos individuales",
          readerPromise: "El responsable de compras identificará el margen de ahorro en partidas de conectividad 10G manteniendo máxima garantía.",
          rationale: "Foco directo en optimización de presupuesto y disponibilidad de stock.",
          relevanceScore: 96
        }
      ];
    } else {
      return [
        {
          id: "angle-dac-dist-1",
          title: "Oportunidades de Venta Cruzada en Electrónica 10G: Prescripción de Cables DAC con Switches SFP+",
          editorialQuestion: "¿Cómo complementar la venta de switches gestionables L2+ ofreciendo latiguillos troncales pasivos listos para usar?",
          tension: "venta aislada de electrónica vs paquete completo de interconexión homologado",
          readerPromise: "El distribuidor sabrá cómo elevar el ticket medio prescindiendo de marcas genéricas no homologadas.",
          rationale: "Orientado a oportunidades de negocio en el canal B2B.",
          relevanceScore: 94
        }
      ];
    }
  }

  // ÁNGULOS PARA PUNTOS DE ACCESO WI-FI 7
  if (productType === "ACCESS_POINT") {
    if (isInstaller) {
      return [
        {
          id: "angle-ap-1",
          title: "Puesta en Marcha Wi-Fi 7 en Obra: Cómo Evitar Caídas PoE y Tiempos Muertos de Configuración",
          editorialQuestion: "¿Por qué el 70% de las incidencias en puntos de acceso Wi-Fi 7 provienen del switch de acceso y la alimentación PoE no auditada?",
          tension: "velocidad inalámbrica teórica vs presupuesto PoE real por puerto y estabilidad en techo",
          readerPromise: "El instalador aprenderá a dimensionar la potencia PoE+ y usar el aprovisionamiento QR para entregar la obra sin segundas visitas.",
          rationale: "Enfocado en resolver problemas en obra y tiempos de montaje.",
          relevanceScore: 97
        }
      ];
    } else if (isTicDirector) {
      return [
        {
          id: "angle-ap-tic-1",
          title: "Arquitectura Wi-Fi 7 Enterprise: Mitigación de Interferencias RF y Gestión Cloud sin Suscripciones",
          editorialQuestion: "¿Cómo desplegar modulación 4096-QAM y Roaming rápido sin asumir cuotas recurrentes por punto de acceso?",
          tension: "gestión cloud unificada vs licencias de software obligatorias por equipo",
          readerPromise: "El director TIC comprenderá la topología de red requerida para garantizar seguridad WPA3 y escalabilidad a 0€ en cuotas.",
          rationale: "Enfocado en gobernanza de TI y TCO de software.",
          relevanceScore: 98
        }
      ];
    }
  }

  // ÁNGULOS PARA SWITCHES Y OTROS DISPOSITIVOS (FALLBACK EDITORIAL DE ALTA CALIDAD)
  return [
    {
      id: "angle-generic-1",
      title: `Criterios de Ingeniería y Selección de Electrónica de Red para ${model}`,
      editorialQuestion: `¿Cómo asegurar la tasa de conmutación y la segmentación por VLANs en la capa de acceso corporativa con el ${model}?`,
      tension: "switches no gestionados de bajo coste vs electrónica L2+ con balance PoE y soporte VLAN",
      readerPromise: "El profesional aprenderá a auditar la capacidad de conmutación sin bloqueo y el balance térmico del chasis.",
      rationale: "Ángulo consultivo técnico de selección.",
      relevanceScore: 92
    }
  ];
}

/**
 * Selecciona el MEJOR ángulo candidato evaluando interés, rigor y relevancia
 */
export function selectBestEditorialAngle(candidates: EditorialAngle[]): EditorialAngle {
  if (!candidates || candidates.length === 0) {
    throw new Error("No hay candidatos de ángulos editoriales disponibles.");
  }
  return [...candidates].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
}
