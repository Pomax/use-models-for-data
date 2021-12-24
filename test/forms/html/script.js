import {
  createElement,
  render,
} from "https://cdn.jsdelivr.net/npm/preact/dist/preact.mjs";
import { User, Config } from "./model.js";

const FULL = true;

const config = Config.create();
const user = User.create({
  profile: {
    name: `test`,
    password: `also test`,
  },
});

// plain HTML testing
let html = FULL ? user.toHTMLForm() : config.toHTMLForm();
document.body.innerHTML = html;

html = FULL ? user.toHTMLTable() : config.toHTMLTable();
document.body.innerHTML += `<hr>Table<hr>${html}`;

html = FULL ? user.toHTMLTableRows() : config.toHTMLTableRows();
document.body.innerHTML += `<hr>Table rows<hr><table>${html}</table>`;

// Preact testing

let opts = { create: createElement, inputHandler: () => {} };
let app = FULL ? user.toForm(opts) : config.toForm(opts);
let div = document.createElement(`div`);
document.body.appendChild(div);
render(app, div);

document.body.appendChild(document.createElement(`hr`));

app = FULL ? user.toTable(opts) : config.toTable(opts);
div = document.createElement(`div`);
document.body.appendChild(div);
render(app, div);

document.body.appendChild(document.createElement(`hr`));

app = FULL ? user.toTableRows(opts) : config.toTableRows(opts);
div = document.createElement(`div`);
document.body.appendChild(div);
render(createElement(`table`, { children: app }), div);
