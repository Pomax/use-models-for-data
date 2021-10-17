import { MissingCreateFunction } from "../errors.js";
import { TYPE_DEFAULTS } from "../equals/types.js";

export function getCreateFunction(options) {
  return (
    options?.create ??
    function () {
      throw new MissingCreateFunction();
    }
  );
}

export function __appendChildNode(
  children,
  create,
  id,
  choices,
  type,
  ref,
  required,
  disabled,
  inputHandler = {}
) {
  if (ref === undefined) {
    ref = TYPE_DEFAULTS[type];
  }

  // select element
  if (choices) {
    const props = {
      children: choices.map((choice) => {
        const props = {
          value: choice,
          children: [choice],
        };
        if (ref !== undefined && choice == ref) {
          props.selected = `selected`;
        }
        return create(`option`, props);
      }),
      ...inputHandler,
    };
    if (id !== undefined) {
      props.id = id;
      props.name = id;
    }
    if (required !== undefined) props.required = required;
    if (disabled !== undefined) props.disabled = disabled;
    children.push(create(`select`, props));
  }

  // checkbox input
  else if (type === "boolean") {
    const props = {
      type: `checkbox`,
      checked: ref === true,
      ...inputHandler,
    };
    if (id !== undefined) {
      props.id = id;
      props.name = id;
    }
    if (disabled !== undefined) props.disabled = disabled;
    children.push(create(`input`, props));
  }

  // standard text input
  else {
    const props = {
      type: type,
      value: ref,
      ...inputHandler,
    };
    if (id !== undefined) {
      props.id = id;
      props.name = id;
    }
    if (required !== undefined) props.required = required;
    if (disabled !== undefined) props.disabled = disabled;
    children.push(create(`input`, props));
  }
  return children;
}
