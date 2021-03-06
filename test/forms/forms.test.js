import util from "util";
import { JSDOM } from "jsdom";
import { Models } from "use-models-for-data";
import { User } from "../models/user.model.js";
import { BadForm } from "../models/model.with.bad.form.js";

describe(`Testing form generation from models`, () => {
  let user = undefined;

  const iterableNodeCreate = (tag, props) => {
    const node = { tag, ...props };
    node.findById = (id) => {
      if (node.id === id) return node;
      if (!node.children) return;
      for (let child of node.children) {
        if (!child) continue;
        if (!child.findById) continue;
        const result = child.findById(id);
        if (result) return result;
      }
    };
    return node;
  };

  beforeAll(async () => {
    Models.register(User);
    user = User.create({
      profile: {
        name: `username`,
        password: `password`,
        preferences: {
          avatar: `test.png`,
        },
      },
    });
  });

  // ╔══════════════════════╗
  // ║ THE TESTS START HERE ║
  // ╚══════════════════════╝

  test(`Form declarations with non-existent fields should throws on registration`, async () => {
    let err;
    try {
      await Models.register(BadForm);
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    const missing = err.missing[0].list;
    expect(missing).toStrictEqual([`unknown_field_1`, `unknown_field_2`]);
  });

  test(`Can create HTML user form`, () => {
    const formHTML = user.toHTMLForm();
    const document = new JSDOM(formHTML).window.document;

    expect(document.getElementById(`profile.name`)).toBeNull();
    expect(document.getElementById(`profile.password`)).toBeNull();

    const avatar = document.getElementById(`profile.preferences.avatar`);
    expect(avatar).not.toBeNull();
    expect(avatar.value).toBe(user.profile.preferences.avatar);

    const allow_chat = document.getElementById(
      `profile.preferences.config.allow_chat`
    );
    expect(allow_chat).not.toBeNull();
    expect(allow_chat.checked).toBe(user.profile.preferences.config.allow_chat);

    // TODO add all other fields
  });

  test(`Can create HTML user form table`, () => {
    const tableHTML = user.toHTMLTable();
    const document = new JSDOM(tableHTML).window.document;

    expect(document.getElementById(`profile.name`)).toBeNull();
    expect(document.getElementById(`profile.password`)).toBeNull();

    const avatar = document.getElementById(`profile.preferences.avatar`);
    expect(avatar).not.toBeNull();
    expect(avatar.value).toBe(user.profile.preferences.avatar);

    const allow_chat = document.getElementById(
      `profile.preferences.config.allow_chat`
    );
    expect(allow_chat).not.toBeNull();
    expect(allow_chat.checked).toBe(user.profile.preferences.config.allow_chat);

    // TODO add all other fields
  });

  test(`Can create HTML user form table rows`, () => {
    const tableHTML = user.toHTMLTableRows();
    const document = new JSDOM(`<table>${tableHTML}</table>`).window.document;

    expect(document.getElementById(`profile.name`)).toBeNull();
    expect(document.getElementById(`profile.password`)).toBeNull();

    const avatar = document.getElementById(`profile.preferences.avatar`);
    expect(avatar).not.toBeNull();
    expect(avatar.value).toBe(user.profile.preferences.avatar);

    const allow_chat = document.getElementById(
      `profile.preferences.config.allow_chat`
    );
    expect(allow_chat).not.toBeNull();
    expect(allow_chat.checked).toBe(user.profile.preferences.config.allow_chat);

    // TODO add all other fields
  });

  test(`Can create tree-based form`, (done) => {
    const submit = (done) => {
      const avatar = tree.findById(`profile.preferences.avatar`);
      expect(avatar).toBeDefined();
      expect(avatar.value).toBe(user.profile.preferences.avatar);

      const allow_chat = tree.findById(`profile.preferences.config.allow_chat`);
      expect(allow_chat).toBeDefined();
      expect(allow_chat.checked).toBe(
        user.profile.preferences.config.allow_chat
      );

      // TODO add all other fields

      done();
    };

    const tree = user.toForm({
      onSubmit: () => submit(done),
      create: iterableNodeCreate,
    });

    tree.onSubmit();
  });

  test(`Can create tree-based user form table`, (done) => {
    const submit = (done) => {
      const avatar = tree.findById(`profile.preferences.avatar`);
      expect(avatar).toBeDefined();
      expect(avatar.value).toBe(user.profile.preferences.avatar);

      const allow_chat = tree.findById(`profile.preferences.config.allow_chat`);
      expect(allow_chat).toBeDefined();
      expect(allow_chat.checked).toBe(
        user.profile.preferences.config.allow_chat
      );

      // TODO add all other fields

      done();
    };

    const tree = user.toTable({
      onSubmit: () => submit(done),
      create: iterableNodeCreate,
    });
    tree.onSubmit();
  });

  test(`Can create tree-based user form table rows`, (done) => {
    const submit = (done) => {
      const avatar = tree.findById(`profile.preferences.avatar`);
      expect(avatar).toBeDefined();
      expect(avatar.value).toBe(user.profile.preferences.avatar);

      const allow_chat = tree.findById(`profile.preferences.config.allow_chat`);
      expect(allow_chat).toBeDefined();
      expect(allow_chat.checked).toBe(
        user.profile.preferences.config.allow_chat
      );

      // TODO add all other fields

      done();
    };

    const tree = iterableNodeCreate(`table`, {
      children: user.toTableRows({
        create: iterableNodeCreate,
      }),
      onSubmit: () => submit(done),
    });

    tree.onSubmit();
  });
});
