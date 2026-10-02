import assert from "node:assert/strict";
import { parseGesioXmlCatalog } from "../src/lib/services/gesio-xml-parser";
import { buildFeedProductIntelligence } from "../src/lib/services/feed-product-intelligence";
import { ECOMSHOP_FULL_CATALOG } from "../src/lib/data/ecomshop-catalog";

const xml = `
<catalog>
  <producto>
    <referencia_interna>ST3105G</referencia_interna>
    <titulo>STONET ST3105G Switch Gigabit 5 Puertos</titulo>
    <marca>STONET</marca>
    <referencia_modelo>ST3105G</referencia_modelo>
    <precio>19.90</precio>
    <url_producto>https://www.ecomshop.es/stonet-st3105g</url_producto>
    <url_imagen>https://www.ecomshop.es/image/st3105g.jpg</url_imagen>
    <descripcion>Switch Gigabit 5 puertos 10/100/1000 Mbps. IEEE 802.3. Switching 10 Gbps.</descripcion>
    <disponibilidad>1</disponibilidad>
    <categoria>Switches Ethernet</categoria>
  </producto>
</catalog>`;

const [feedProduct] = parseGesioXmlCatalog(xml);
assert.equal(feedProduct.sku, "ST3105G");
assert.equal(feedProduct.brand, "STONET");
assert.equal(feedProduct.deviceType, "SWITCH");
assert.equal(feedProduct.url, "https://www.ecomshop.es/stonet-st3105g");
assert.equal(feedProduct.recommendedBundle.sku, "");
assert.equal(feedProduct.powerConsumptionWatts, 0);

const feedIntel = buildFeedProductIntelligence(feedProduct);
assert.equal(feedIntel.card.product.sku, "ST3105G");
assert.equal(feedIntel.card.product.brand, "STONET");
assert.deepEqual(feedIntel.card.complementaryProducts, []);
assert.equal(feedIntel.mandatoryElectronics.recommendedSwitchSku, "");
assert.ok(feedIntel.card.evidenceLedger.every((e) => e.source === feedProduct.url));

const knownProduct = ECOMSHOP_FULL_CATALOG[0];
const knownIntel = buildFeedProductIntelligence(knownProduct);
assert.equal(knownIntel.card.product.sku, knownProduct.sku);
assert.equal(knownIntel.card.product.brand, knownProduct.brand);
assert.deepEqual(knownIntel.card.complementaryProducts, []);

console.log("PASS: EcomShop feed is the sole Product Truth and no implicit bundle is injected.");
