import {
  createElement,
  render,
} from "https://cdn.jsdelivr.net/npm/preact/dist/preact.mjs";
import { User, Config } from "./model.js";

const HTML = false;
const FULL = false;

const config = Config.create();
const user = User.create({
  profile: {
    name: `test`,
    password: `also test`,
  },
});

// plain HTML testing
if (HTML) {
  let html = FULL ? user.toHTMLForm() : config.toHTMLForm();
  document.body.innerHTML = html;
}

// Preact testing
else {
  let opts = { create: createElement, inputHandler: () => {} };
  let app = FULL ? user.toForm(opts) : config.toForm(opts);
  render(app, document.body);
}
