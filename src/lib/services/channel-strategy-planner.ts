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
      objective: "Educación técnica profunda, análisis consultivo y resolución de decisión profesional",
      audienceIntent: `El ${audience} busca entender a fondo los criterios de ingeniería, limitaciones y dimensionamiento antes de seleccionar ${brand} ${model} (${sku}).`,
      jobToBeDone: `Comprender y resolver la decisión técnica: ${thesis.technicalQuestion}`,
      narrativeMode: "Análisis consultivo de ingeniería, contexto, criterios de decisión, límites y aplicación real",
      primaryArgument: thesis.centralArgument,
      supportingArguments: [
        `Definir primero el escenario real y la necesidad antes de mirar especificaciones aisladas.`,
        `Interpretar datos verificables: ${verifiedFacts[0] || keyDifferentiators[0] || "Interfaces certificadas"}.`,
        `Evaluar compatibilidad, límites de instalación y crecimiento previsto sin sobredimensionar.`
      ],
      productEvidence: verifiedFacts.length > 0 ? verifiedFacts : keyDifferentiators,
      forbiddenClaims: [
        "Precios numéricos en euros",
        "Tiempos de entrega no verificados (24/48h)",
        "Garantías o condiciones comerciales no documentadas en el feed"
      ],
      forbiddenOverlap: [
        "resumen superficial de 2 párrafos",
        "copia de ficha técnica o folleto comercial",
        "promesas publicitarias vacías sin fundamento técnico"
      ],
      desiredEmotion: "Confianza técnica y claridad analítica para fundamentar un proyecto",
      ctaObjective: "Estudiar la arquitectura de red y validar los requisitos técnicos con el equipo consultivo",
      targetLength: 1400,
      structure: [
        "Hook con problema profesional",
        "Contexto del escenario",
        "Tensión técnica y análisis",
        "Criterios de evaluación aplicables",
        "Aplicación concreta y datos verificados",
        "Límites técnicos y comprobaciones previas",
        "Decisión final recomendada"
      ]
    };

    const linkedinStrategy: ChannelStrategy = {
      channel: "LINKEDIN",
      objective: "Autoridad profesional, debate técnico y reflexión en comunidad",
      audienceIntent: `El profesional del sector revisa su feed para contrastar prácticas habituales de despliegue y evitar errores frecuentes en ${decision.productType}.`,
      jobToBeDone: `Cuestionar una decisión de diseño habitual y aportar un insight técnico con base en ${model}.`,
      narrativeMode: "Perspectiva de industria, problema real en campo, aprendizaje accionable y llamada a debate",
      primaryArgument: `Muchos despliegues cometen el error de asumir que la especificación nominal basta; la tensión real es: ${angle.tension}.`,
      supportingArguments: [
        `Una mala estimación en ${context.effectiveCategory} provoca retrabajos y cuellos de botella no previstos.`,
        `En proyectos reales analizando ${brand} ${sku}, la clave reside en verificar el comportamiento bajo carga antes de cerrar la topología.`
      ],
      productEvidence: keyDifferentiators.slice(0, 2),
      forbiddenClaims: [
        "Afirmaciones de stock garantizado o entrega urgente",
        "Descuentos o tarifas comerciales"
      ],
      forbiddenOverlap: [
        "copiar o resumir el artículo del blog",
        "lenguaje de catálogo con viñetas de especificaciones crudas",
        "mensaje publicitario 'cómpralo ya'"
      ],
      desiredEmotion: "Interés reflexivo e impulso de contraste técnico con otros colegas",
      ctaObjective: "¿Cómo abordáis este cuello de botella en vuestros despliegues? Debate en comentarios.",
      targetLength: 220,
      structure: [
        "Hook reflexivo",
        "Problema habitual en despliegues",
        "Insight técnico contrastado",
        "Evidencia de laboratorio",
        "Consecuencia profesional",
        "Pregunta abierta a la comunidad"
      ]
    };

    const whatsappStrategy: ChannelStrategy = {
      channel: "WHATSAPP",
      objective: "Activación comercial ágil para integradores y responsables técnicos",
      audienceIntent: `El instalador o técnico necesita saber en 15 segundos si este equipo resuelve su necesidad inmediata o de proyecto.`,
      jobToBeDone: `Decidir rápidamente si merece la pena actuar, contrastar especificaciones o comprobar compatibilidad para una instalación en curso.`,
      narrativeMode: "Directo, profesional, conciso, orientado a resolver la duda de campo sin retórica publicitaria",
      primaryArgument: `Para instalaciones que requieren resolver ${thesis.technicalQuestion.replace(/^¿|\?$/g, "")}, ${brand} ${sku} aporta ${keyDifferentiators[0] || "solvencia técnica comprobada"}.`,
      supportingArguments: [
        `Dato clave: ${keyDifferentiators[1] || "Diseño y conmutación fiables según especificaciones oficiales"}.`,
        `Documentación técnica disponible en el portal.`
      ],
      productEvidence: [sku, model, ...(keyDifferentiators.slice(0, 2))],
      forbiddenClaims: [
        "stock y soporte directo en 24/48h",
        "precios netos o descuentos sin verificar",
        "afirmaciones de entrega inmediata"
      ],
      forbiddenOverlap: [
        "resumen largo o fragmento del blog",
        "análisis teórico extenso",
        "mensajes spam sin datos técnicos concretos"
      ],
      desiredEmotion: "Resolución rápida y utilidad práctica",
      ctaObjective: "Consultar especificaciones oficiales y compatibilidad",
      targetLength: 75,
      structure: [
        "Hook directo",
        "Escenario de aplicación",
        "Ventaja demostrable verificada",
        "Enlace y CTA conciso"
      ]
    };

    const mailchimpStrategy: ChannelStrategy = {
      channel: "MAILCHIMP",
      objective: "Consideración técnica y defensa de proyecto para decisión de aprovisionamiento",
      audienceIntent: `El suscriptor técnico busca justificar una selección o renovación de equipamiento con argumentos sólidos y solvencia.`,
      jobToBeDone: `Ayudar a evaluar si ${model} (${sku}) encaja en los criterios de homologación de proyectos de conectividad.`,
      narrativeMode: "Caso de negocio técnico, fiabilidad de ingeniería, objeción técnica resuelta y llamada clara",
      primaryArgument: `Cómo resolver ${thesis.problem} optimizando la arquitectura sin comprometer estándares ni estabilidad.`,
      supportingArguments: [
        `Diferencial técnico comprobado frente a alternativas complejas: ${keyDifferentiators[0] || "Arquitectura eficiente"}.`,
        `Documentación contrastable y soporte de ingeniería para homologación.`
      ],
      productEvidence: verifiedFacts.slice(0, 3),
      forbiddenClaims: [
        "entrega en 24/48h garantizada",
        "unidades de prueba gratuitas sin confirmación",
        "sustitución avanzada salvo que esté en la garantía oficial"
      ],
      forbiddenOverlap: [
        "copiar el cuerpo del post de blog",
        "newsletter meramente promocional de 'ofertas'",
        "texto genérico desconectado de la tesis editorial"
      ],
      desiredEmotion: "Seguridad técnica y solvencia para defender la propuesta",
      ctaObjective: "Consultar la documentación técnica y validar el dimensionamiento",
      targetLength: 350,
      structure: [
        "Asunto y preview directo",
        "Problema de diseño o aprovisionamiento",
        "Consecuencia en la instalación",
        "Evidencia contrastable del producto",
        "Resolución de objeción técnica",
        "Llamada a la acción técnica"
      ]
    };

    const geoStrategy: ChannelStrategy = {
      channel: "GEO",
      objective: "Visibilidad AEO/GEO y respuesta directa estructurada a consultas profesionales",
      audienceIntent: `Motores de IA generativa y profesionales buscando respuestas concretas, especificaciones exactas y tablas de decisión.`,
      jobToBeDone: `Obtener una respuesta técnica verificable, sin ambigüedades, estructurada en entidades y datos fiables sobre ${sku}.`,
      narrativeMode: "Respuesta directa Q&A, entidades canónicas, tabla de parámetros verificados y structured data JSON-LD",
      primaryArgument: `Para despliegues profesionales que deben resolver ${thesis.technicalQuestion.replace(/^¿|\?$/g, "")}, la integración de ${brand} ${model} (${sku}) garantiza ${thesis.centralArgument}.`,
      supportingArguments: [
        `Especificaciones formales del feed EcomShop para ${sku}.`,
        `Criterios de compatibilidad y límites de aplicación verificados: ${thesis.solutionApproach}.`
      ],
      productEvidence: verifiedFacts,
      forbiddenClaims: [
        "Afirmaciones comerciales genéricas",
        "Precios o plazos de entrega sin feed"
      ],
      forbiddenOverlap: [
        "introducciones largas con clichés o storytelling",
        "datos no contrastados o inferencias no presentes en el feed",
        "opiniones comerciales subjetivas"
      ],
      desiredEmotion: "Rigor informativo y precisión enciclopédica",
      ctaObjective: "Referencia a la ficha técnica oficial de EcomShop y datos normalizados Schema.org",
      targetLength: 450,
      structure: [
        "Pregunta profesional directa",
        "Respuesta sintética inmediata (Answer-First)",
        "Explicación técnica fundamentada",
        "Tabla o datos normalizados",
        "Limitaciones y condiciones de despliegue"
      ]
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
