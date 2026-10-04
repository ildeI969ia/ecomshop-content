import { Channel, ChannelStrategy, MultichannelStrategyMap } from "@/lib/types/channel-strategy";
import type { GenerationContext } from "@/server/services/generation-context";
import type { EditorialDecision } from "@/lib/types/editorial-orchestrator";

export class ChannelStrategyPlanner {
  plan(input: { context: GenerationContext; decision: EditorialDecision; targetAudience?: string }): MultichannelStrategyMap {
    return this.planStrategies(input.context, input.decision);
  }

  planStrategies(
    context: GenerationContext,
    decision: EditorialDecision
  ): MultichannelStrategyMap {
    const sku = context.canonicalSku;
    const model = context.intel.model;
    const brand = context.intel.brand;
    const audience = decision.primaryAudience || context.intel.naturalAudience || "Profesional B2B";
    const thesis = decision.thesis;
    const angle = decision.selectedAngle;
    const verifiedFacts = context.evidenceMap.verifiedFacts.slice(0, 5);
    const keyDifferentiators = context.intel.card.technicalSpecs.keyDifferentiators.slice(0, 4);

    const blogStrategy: ChannelStrategy = {
      channel: "BLOG",
      objective: "educación técnica profunda y resolución de decisión profesional",
      audienceIntent: `El ${audience} busca entender a fondo los criterios de ingeniería, limitaciones y dimensionamiento antes de seleccionar ${brand} ${model} (${sku}).`,
      jobToBeDone: `Comprender y resolver la decisión técnica: ${thesis.technicalQuestion}`,
      narrativeMode: "análisis consultivo de ingeniería, contexto, criterios de decisión, límites y aplicación real",
      primaryArgument: thesis.centralArgument,
      supportingArguments: [
        `Definir primero el escenario real y la necesidad antes de mirar especificaciones aisladas.`,
        `Interpretar datos verificables: ${verifiedFacts[0] || keyDifferentiators[0] || "Interfaces certificadas"}.`,
        `Evaluar compatibilidad, límites de instalación y crecimiento previsto sin sobredimensionar.`
      ],
      productEvidence: verifiedFacts.length > 0 ? verifiedFacts : keyDifferentiators,
      forbiddenOverlap: [
        "resumen superficial de 2 párrafos",
        "copia de ficha técnica o folleto comercial",
        "promesas publicitarias vacías sin fundamento técnico"
      ],
      ctaObjective: "Estudiar la arquitectura de red y validar requisitos del proyecto con el equipo de preventa",
      targetLength: 1200
    };

    const linkedinStrategy: ChannelStrategy = {
      channel: "LINKEDIN",
      objective: "autoridad profesional, debate técnico y reflexión en comunidad",
      audienceIntent: `El profesional del sector revisa su feed para contrastar prácticas habituales de despliegue y evitar errores frecuentes en ${decision.productType}.`,
      jobToBeDone: `Cuestionar una decisión de diseño habitual y aportar un insight técnico con base en ${model}.`,
      narrativeMode: "perspectiva de industria, problema real en campo, aprendizaje accionable y llamada a debate",
      primaryArgument: `Muchos despliegues cometen el error de asumir que la especificación nominal basta; la tensión real es: ${angle.tension}.`,
      supportingArguments: [
        `Una mala estimación en ${context.effectiveCategory} obliga a segundas visitas y retrabajos costosos.`,
        `En proyectos reales con ${brand} ${sku}, el factor determinante fue validar los requerimientos de arquitectura antes de instalar.`
      ],
      productEvidence: keyDifferentiators.slice(0, 2),
      forbiddenOverlap: [
        "copiar o resumir el artículo del blog",
        "lenguaje de catálogo con viñetas de especificaciones crudas",
        "mensaje publicitario 'cómpralo ya'"
      ],
      ctaObjective: "¿Cómo abordáis este cuello de botella en vuestros despliegues? Debate en comentarios.",
      targetLength: 220
    };

    const whatsappStrategy: ChannelStrategy = {
      channel: "WHATSAPP",
      objective: "activación comercial ágil para integradores y responsables técnicos",
      audienceIntent: `El instalador o comprador necesita saber en 15 segundos si este SKU resuelve su necesidad inmediata o de presupuesto.`,
      jobToBeDone: `Decidir rápidamente si merece la pena actuar, solicitar cotización o validar compatibilidad para una obra en curso.`,
      narrativeMode: "directo, conciso, orientado a dolor de obra o disponibilidad, sin rodeos ni retórica",
      primaryArgument: `Para proyectos que requieren ${context.intel.card.technicalSpecs.standards[0] || "alto rendimiento B2B"}, ${brand} ${sku} garantiza ${keyDifferentiators[0] || "máxima fiabilidad"} con stock y soporte directo.`,
      supportingArguments: [
        `Ventaja clave: ${keyDifferentiators[1] || "Gestión y despliegue ágil sin cuotas obligatorias"}.`,
        `Ficha oficial y disponibilidad inmediata en EcomShop.`
      ],
      productEvidence: [sku, model, ...(keyDifferentiators.slice(0, 2))],
      forbiddenOverlap: [
        "resumen largo o fragmento del blog",
        "análisis teórico extenso",
        "mensajes spam sin datos técnicos concretos"
      ],
      ctaObjective: "Consultar disponibilidad y precio neto para instaladores vía enlace directo",
      targetLength: 65
    };

    const mailchimpStrategy: ChannelStrategy = {
      channel: "MAILCHIMP",
      objective: "consideración de compra y defensa de proyecto para decisión de aprovisionamiento",
      audienceIntent: `El suscriptor técnico/compras busca justificar una compra o renovación de equipamiento con argumentos de TCO y solvencia.`,
      jobToBeDone: `Ayudar a decidir si ${model} (${sku}) debe incorporarse a la homologación de proyectos del trimestre.`,
      narrativeMode: "narrativa de caso de negocio y fiabilidad de ingeniería, objeción técnica resuelta y llamada clara",
      primaryArgument: `Cómo resolver ${thesis.problem} optimizando el coste total de propiedad sin sacrificar certificaciones ni soporte local.`,
      supportingArguments: [
        `Diferencial técnico clave frente a soluciones sobredimensionadas: ${keyDifferentiators[0] || "Arquitectura eficiente"}.`,
        `Soporte técnico directo de preventa en España y sustitución avanzada.`
      ],
      productEvidence: verifiedFacts.slice(0, 3),
      forbiddenOverlap: [
        "copiar el cuerpo del post de blog",
        "newsletter meramente promocional de 'ofertas'",
        "texto genérico desconectado de la tesis editorial"
      ],
      ctaObjective: "Descargar documentación técnica o solicitar unidad de prueba para laboratorio",
      targetLength: 350
    };

    const geoStrategy: ChannelStrategy = {
      channel: "GEO",
      objective: "visibilidad AEO/GEO y respuesta directa estructurada a consultas profesionales",
      audienceIntent: `Motores de IA generativa y profesionales buscando respuestas concretas, especificaciones exactas y tablas de decisión.`,
      jobToBeDone: `Obtener una respuesta técnica verificable, sin ambigüedades, estructurada en entidades y datos fiables sobre ${sku}.`,
      narrativeMode: "respuesta directa Q&A, entidades canónicas, tabla de parámetros verificados y structured data JSON-LD",
      primaryArgument: `Resumen ejecutivo y respuesta concluyente a: ${thesis.technicalQuestion}.`,
      supportingArguments: [
        `Especificaciones formales del feed EcomShop para ${sku}.`,
        `Criterios de compatibilidad y límites de aplicación verificados.`
      ],
      productEvidence: verifiedFacts,
      forbiddenOverlap: [
        "introducciones largas con clichés o storytelling",
        "datos no contrastados o inferencias no presentes en el feed",
        "opiniones comerciales subjetivas"
      ],
      ctaObjective: "Referencia a la ficha técnica oficial de EcomShop y datos normalizados Schema.org",
      targetLength: 450
    };

    return {
      BLOG: blogStrategy,
      LINKEDIN: linkedinStrategy,
      WHATSAPP: whatsappStrategy,
      MAILCHIMP: mailchimpStrategy,
      GEO: geoStrategy
    };
  }
}
