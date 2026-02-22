export const ontologyPage = `
<h2>What is the OpenIndex Ontology?</h2>
<p>The OpenIndex Ontology is a community-maintained schema that defines the types of entities, properties, and relationships used throughout the OpenIndex platform. It provides a shared vocabulary for describing web content, enabling interoperability between the knowledge graph, search index, and external systems.</p>

<p>The ontology is designed to be:</p>
<ul>
  <li><strong>Schema.org compatible</strong> -- Core classes align with Schema.org types, so existing structured data on the web maps naturally to OpenIndex entities.</li>
  <li><strong>Extensible</strong> -- New entity types, properties, and relationships can be proposed and added through community governance.</li>
  <li><strong>Machine-readable</strong> -- Available in JSON-LD, RDF/XML, OWL, and Turtle formats for use with semantic web tools.</li>
  <li><strong>Practical</strong> -- Focused on entities and relationships that are commonly found on the web and useful for search, analytics, and knowledge extraction.</li>
</ul>

<h2>Schema.org Compatibility</h2>
<p>The OpenIndex Ontology extends <a href="https://schema.org/">Schema.org</a> rather than replacing it. Every OpenIndex entity class is either directly mapped to a Schema.org type or is defined as a subclass of one. This means:</p>

<ul>
  <li>Pages with JSON-LD, Microdata, or RDFa markup using Schema.org types are automatically mapped to OpenIndex entities.</li>
  <li>OpenIndex entity exports use Schema.org properties where applicable, ensuring compatibility with existing tools and datasets.</li>
  <li>Custom OpenIndex properties use the <code>oi:</code> namespace prefix to distinguish them from standard Schema.org properties.</li>
</ul>

<pre><code>// OpenIndex namespace
@prefix oi:     &lt;https://openindex.org/ontology/&gt; .
@prefix schema: &lt;https://schema.org/&gt; .
@prefix rdfs:   &lt;http://www.w3.org/2000/01/rdf-schema#&gt; .

// Example: OpenIndex Person extends schema:Person
oi:Person rdfs:subClassOf schema:Person .
oi:Person rdfs:label "Person" .
oi:Person rdfs:comment "A named individual identified in web content." .</code></pre>

<h2>Core Entity Classes</h2>
<p>The ontology defines the following core entity classes. Each class has a set of standard properties and supported relationship types.</p>

<details>
  <summary>WebPage</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:WebPage</code></p>
    <p>Represents a crawled web page. This is the fundamental unit of the OpenIndex corpus.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>url</code></td><td>URL</td><td>Canonical URL of the page</td></tr>
        <tr><td><code>name</code></td><td>Text</td><td>Page title</td></tr>
        <tr><td><code>description</code></td><td>Text</td><td>Meta description</td></tr>
        <tr><td><code>inLanguage</code></td><td>Language</td><td>Primary content language</td></tr>
        <tr><td><code>datePublished</code></td><td>DateTime</td><td>Publication date (if available)</td></tr>
        <tr><td><code>dateModified</code></td><td>DateTime</td><td>Last modification date</td></tr>
        <tr><td><code>oi:fetchTime</code></td><td>DateTime</td><td>When OpenIndex crawled the page</td></tr>
        <tr><td><code>oi:contentDigest</code></td><td>Text</td><td>SHA-1 digest of the response body</td></tr>
        <tr><td><code>oi:crawlId</code></td><td>Text</td><td>Crawl identifier (e.g., OI-2026-02)</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Person</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Person</code></p>
    <p>A named individual identified in web content through NER, structured data, or link analysis.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Full name</td></tr>
        <tr><td><code>alternateName</code></td><td>Text[]</td><td>Aliases, alternate names</td></tr>
        <tr><td><code>url</code></td><td>URL</td><td>Personal website or profile URL</td></tr>
        <tr><td><code>jobTitle</code></td><td>Text</td><td>Current job title</td></tr>
        <tr><td><code>affiliation</code></td><td>Organization</td><td>Current organizational affiliation</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers (Wikidata, LinkedIn, etc.)</td></tr>
        <tr><td><code>oi:mentionCount</code></td><td>Integer</td><td>Number of pages mentioning this person</td></tr>
        <tr><td><code>oi:confidence</code></td><td>Float</td><td>Entity resolution confidence (0.0 - 1.0)</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Organization</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Organization</code></p>
    <p>A company, institution, government agency, NGO, or any named organizational entity.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Official name</td></tr>
        <tr><td><code>alternateName</code></td><td>Text[]</td><td>Aliases, abbreviations, trade names</td></tr>
        <tr><td><code>url</code></td><td>URL</td><td>Official website</td></tr>
        <tr><td><code>foundingDate</code></td><td>Date</td><td>Date the organization was founded</td></tr>
        <tr><td><code>location</code></td><td>Place</td><td>Headquarters location</td></tr>
        <tr><td><code>parentOrganization</code></td><td>Organization</td><td>Parent company or institution</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers</td></tr>
        <tr><td><code>oi:mentionCount</code></td><td>Integer</td><td>Number of pages mentioning this organization</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Place</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Place</code></p>
    <p>A geographic location -- a country, city, address, landmark, or region.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Place name</td></tr>
        <tr><td><code>alternateName</code></td><td>Text[]</td><td>Alternate names, translations</td></tr>
        <tr><td><code>geo</code></td><td>GeoCoordinates</td><td>Latitude and longitude</td></tr>
        <tr><td><code>containedInPlace</code></td><td>Place</td><td>Parent location (e.g., city within country)</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers (GeoNames, Wikidata)</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Event</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Event</code></p>
    <p>A conference, festival, historical event, sports event, or any time-bound occurrence.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Event name</td></tr>
        <tr><td><code>startDate</code></td><td>DateTime</td><td>Start date/time</td></tr>
        <tr><td><code>endDate</code></td><td>DateTime</td><td>End date/time</td></tr>
        <tr><td><code>location</code></td><td>Place</td><td>Where the event takes place</td></tr>
        <tr><td><code>organizer</code></td><td>Organization / Person</td><td>Event organizer</td></tr>
        <tr><td><code>url</code></td><td>URL</td><td>Official event page</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>CreativeWork</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:CreativeWork</code></p>
    <p>An article, book, paper, blog post, video, or other creative content.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Title</td></tr>
        <tr><td><code>author</code></td><td>Person / Organization</td><td>Creator</td></tr>
        <tr><td><code>datePublished</code></td><td>Date</td><td>Publication date</td></tr>
        <tr><td><code>inLanguage</code></td><td>Language</td><td>Content language</td></tr>
        <tr><td><code>about</code></td><td>Topic[]</td><td>Topics covered</td></tr>
        <tr><td><code>url</code></td><td>URL</td><td>URL where the work is published</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers (DOI, ISBN, etc.)</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Product</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Product</code> / <code>schema:SoftwareApplication</code></p>
    <p>A software application, hardware device, or commercial product.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Product name</td></tr>
        <tr><td><code>manufacturer</code></td><td>Organization</td><td>Manufacturer or developer</td></tr>
        <tr><td><code>category</code></td><td>Text</td><td>Product category</td></tr>
        <tr><td><code>url</code></td><td>URL</td><td>Official product page</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers</td></tr>
        <tr><td><code>oi:mentionCount</code></td><td>Integer</td><td>Number of pages mentioning this product</td></tr>
      </tbody>
    </table>
  </div>
</details>

<details>
  <summary>Topic</summary>
  <div class="details-body">
    <p><strong>Schema.org mapping:</strong> <code>schema:Thing</code> (extended with <code>oi:Topic</code>)</p>
    <p>A subject, field of study, theme, or concept. Topics are used to classify content and connect entities by shared subject matter.</p>
    <h4>Properties</h4>
    <table>
      <thead>
        <tr><th>Property</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        <tr><td><code>name</code></td><td>Text</td><td>Topic name</td></tr>
        <tr><td><code>alternateName</code></td><td>Text[]</td><td>Synonyms and alternate labels</td></tr>
        <tr><td><code>broader</code></td><td>Topic</td><td>Broader/parent topic</td></tr>
        <tr><td><code>narrower</code></td><td>Topic[]</td><td>Narrower/child topics</td></tr>
        <tr><td><code>sameAs</code></td><td>URL[]</td><td>External identifiers (Wikidata, LCSH, etc.)</td></tr>
        <tr><td><code>oi:pageCount</code></td><td>Integer</td><td>Number of pages classified under this topic</td></tr>
      </tbody>
    </table>
  </div>
</details>

<h2>Relationship Types</h2>
<p>The ontology defines the following relationship types for connecting entities:</p>

<table>
  <thead>
    <tr>
      <th>Relationship</th>
      <th>Domain</th>
      <th>Range</th>
      <th>Inverse</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>oi:mentions</code></td>
      <td>WebPage</td>
      <td>Any</td>
      <td><code>oi:mentionedIn</code></td>
    </tr>
    <tr>
      <td><code>oi:affiliatedWith</code></td>
      <td>Person</td>
      <td>Organization</td>
      <td><code>oi:hasAffiliate</code></td>
    </tr>
    <tr>
      <td><code>oi:locatedIn</code></td>
      <td>Organization / Event</td>
      <td>Place</td>
      <td><code>oi:locationOf</code></td>
    </tr>
    <tr>
      <td><code>oi:relatedTo</code></td>
      <td>Any</td>
      <td>Any</td>
      <td><code>oi:relatedTo</code> (symmetric)</td>
    </tr>
    <tr>
      <td><code>oi:worksOn</code></td>
      <td>Person</td>
      <td>Topic / Product</td>
      <td><code>oi:workedOnBy</code></td>
    </tr>
    <tr>
      <td><code>oi:partOf</code></td>
      <td>Organization</td>
      <td>Organization</td>
      <td><code>oi:hasPart</code></td>
    </tr>
    <tr>
      <td><code>oi:createdBy</code></td>
      <td>Product / CreativeWork</td>
      <td>Person / Organization</td>
      <td><code>oi:created</code></td>
    </tr>
    <tr>
      <td><code>oi:about</code></td>
      <td>WebPage / CreativeWork</td>
      <td>Topic</td>
      <td><code>oi:topicOf</code></td>
    </tr>
    <tr>
      <td><code>schema:sameAs</code></td>
      <td>Any</td>
      <td>Any</td>
      <td><code>schema:sameAs</code> (symmetric)</td>
    </tr>
    <tr>
      <td><code>oi:linksTo</code></td>
      <td>WebPage</td>
      <td>WebPage</td>
      <td><code>oi:linkedFrom</code></td>
    </tr>
  </tbody>
</table>

<h2>How to Extend the Ontology</h2>
<p>The OpenIndex Ontology is a living schema. New entity types, properties, and relationships can be proposed through the community governance process:</p>

<ol>
  <li><strong>Proposal</strong> -- Open a GitHub issue or discussion describing the proposed addition. Include the entity type or property name, its Schema.org alignment (if any), example use cases, and expected impact on the knowledge graph.</li>
  <li><strong>Community Review</strong> -- The proposal is reviewed by community members and the ontology working group. Feedback is incorporated over a 30-day review period.</li>
  <li><strong>Acceptance</strong> -- If the proposal reaches consensus, it is merged into the ontology. New types are added with a <code>oi:</code> namespace prefix and documented here.</li>
  <li><strong>Implementation</strong> -- The extraction pipeline is updated to recognize and populate the new types. Existing data may be retroactively enriched if applicable.</li>
</ol>

<div class="note">
  <strong>Contributing:</strong> Ontology proposals are managed on <a href="https://github.com/nicholasgasior/gopher-crawl">GitHub</a>. See the <a href="/contributing">Contributing</a> page for details on the process and how to get involved.
</div>

<h2>Download Formats</h2>
<p>The ontology definition is available in multiple standard formats:</p>

<table>
  <thead>
    <tr>
      <th>Format</th>
      <th>File</th>
      <th>Use Case</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>JSON-LD Context</strong></td>
      <td><a href="https://openindex.org/ontology/context.jsonld">context.jsonld</a></td>
      <td>Use in JSON-LD documents, API responses</td>
    </tr>
    <tr>
      <td><strong>RDF/XML</strong></td>
      <td><a href="https://openindex.org/ontology/ontology.rdf">ontology.rdf</a></td>
      <td>Import into Protege, triple stores</td>
    </tr>
    <tr>
      <td><strong>OWL</strong></td>
      <td><a href="https://openindex.org/ontology/ontology.owl">ontology.owl</a></td>
      <td>Formal ontology editors, reasoning engines</td>
    </tr>
    <tr>
      <td><strong>Turtle</strong></td>
      <td><a href="https://openindex.org/ontology/ontology.ttl">ontology.ttl</a></td>
      <td>Compact RDF, human-readable</td>
    </tr>
    <tr>
      <td><strong>JSON Schema</strong></td>
      <td><a href="https://openindex.org/ontology/schema.json">schema.json</a></td>
      <td>Validation of JSON entity documents</td>
    </tr>
  </tbody>
</table>

<h2>Example: Entity in JSON-LD</h2>
<p>Here is a complete entity serialized in JSON-LD format, using both Schema.org and OpenIndex properties:</p>

<pre><code>{
  "@context": [
    "https://schema.org",
    "https://openindex.org/ontology/context.jsonld"
  ],
  "@type": "Organization",
  "@id": "https://openindex.org/entity/org:mozilla_foundation",
  "name": "Mozilla Foundation",
  "alternateName": ["Mozilla", "MoFo"],
  "url": "https://mozilla.org",
  "foundingDate": "2003-07-15",
  "location": {
    "@type": "Place",
    "name": "San Francisco, California",
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "parentOrganization": {
    "@type": "Organization",
    "@id": "https://openindex.org/entity/org:mozilla_corporation",
    "name": "Mozilla Corporation"
  },
  "sameAs": [
    "https://www.wikidata.org/wiki/Q55672",
    "https://dbpedia.org/resource/Mozilla_Foundation"
  ],
  "oi:mentionCount": 284930,
  "oi:confidence": 0.99,
  "oi:crawlId": "OI-2026-02",
  "oi:lastSeen": "2026-02-18T12:00:00Z"
}</code></pre>

<h2>Use in Knowledge Graph Construction</h2>
<p>The ontology serves as the backbone for the <a href="/knowledge-graph">OpenIndex Knowledge Graph</a>. Every entity in the graph conforms to the ontology schema, ensuring:</p>

<ul>
  <li><strong>Consistent typing</strong> -- Every entity has exactly one primary type from the ontology.</li>
  <li><strong>Validated properties</strong> -- Entity properties conform to the defined schema, with appropriate data types.</li>
  <li><strong>Typed relationships</strong> -- All edges in the graph use relationship types from the ontology, with domain and range constraints.</li>
  <li><strong>Interoperability</strong> -- Entities can be exported and consumed by any system that understands Schema.org or RDF.</li>
</ul>

<p>If you are building a downstream application that consumes OpenIndex data, using the ontology ensures your system correctly interprets the entity types, properties, and relationships in the knowledge graph.</p>

<h2>Community Governance</h2>
<p>The ontology is governed by the OpenIndex Ontology Working Group, composed of volunteer contributors from the community. The working group meets monthly and all meetings are open to observers.</p>

<ul>
  <li><strong>Meeting schedule:</strong> First Wednesday of each month, 16:00 UTC</li>
  <li><strong>Meeting notes:</strong> Published on the <a href="/blog">blog</a> within one week</li>
  <li><strong>Proposals:</strong> Tracked on <a href="https://github.com/nicholasgasior/gopher-crawl/labels/ontology">GitHub (ontology label)</a></li>
  <li><strong>Major changes:</strong> Require RFC process with 30-day review period</li>
  <li><strong>Minor changes:</strong> (typos, clarifications) Merged directly by working group members</li>
</ul>
`
