const htmlProps = [
  `alt`,
  `checked`,
  `class`,
  `disabled`,
  `for`,
  `href`,
  `id`,
  `name`,
  `placeholder`,
  `selected`,
  `src`,
  `style`,
  `title`,
  `type`,
  `value`,
];

const boolProps = [`checked`, `disabled`, `selected`];

const voidElements = [
  `area`,
  `base`,
  `br`,
  `col`,
  `command`,
  `embed`,
  `hr`,
  `img`,
  `input`,
  `keygen`,
  `link`,
  `meta`,
  `param`,
  `source`,
  `track`,
  `wbr`,
];

class HTMLElement {
  constructor(tag) {
    this.tag = tag;
    this.void = voidElements.includes(tag.toLowerCase());
    this.attributes = [];
    this.children = [];
  }
  setAttribute(name, value) {
    if (boolProps.includes(name)) {
      if (value) {
        return this.attributes.push([name, name]);
      }
    }
    this.attributes.push([name, value]);
  }
  appendChild(element) {
    this.children.push(element);
  }
  get innerHTML() {
    return this.children
      .flat(Number.MAX_SAFE_INTEGER)
      .filter(Boolean)
      .map((e) => (e instanceof HTMLElement ? e.outerHTML : e))
      .join(`\n`);
  }
  get outerHTML() {
    const { tag, attributes } = this;
    let attrs = Object.entries(attributes)
      .map(([key, value]) => `${key}=${value}`)
      .join(` `);
    htmlProps.forEach((prop) => {
      const val = this[prop];
      if (val !== undefined) {
        attrs = `${attrs} ${prop}="${val}"`;
      }
    });
    attrs = attrs.trim();

    if (this.void) return `<${tag}${attrs ? ` ${attrs}` : ``}>`;

    const inner = this.innerHTML;
    return `<${tag}${attrs ? ` ${attrs}` : ``}>${
      inner ? `\n${inner}\n` : ``
    }</${tag}>`;
  }
}

class Document {
  constructor() {
    this.body = new HTMLElement(`body`);
  }
  createElement(tag) {
    return new HTMLElement(tag);
  }
}

const document = new Document();

export { document, htmlProps, boolProps };
