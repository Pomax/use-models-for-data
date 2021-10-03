import { equals } from "./equals.js";

function check(v1, v2) {
  let l1 = v1,
    l2 = v2;
  if (typeof l1 === `string` || l1 instanceof String) {
    l1 = `"${l1.toString()}"`;
  }
  if (l1 instanceof Array) {
    l1 = `[${l1.toString()}]`;
  }
  if (typeof l2 === `string` || l2 instanceof String) {
    l2 = `"${l2.toString()}"`;
  }
  if (l2 instanceof Array) {
    l2 = `[${l2.toString()}]`;
  }
  const str = `${l1}==${l2}`;
  console.log(`${str}\n${``.padStart(str.length, `-`)}`);
  console.log(`strict : ${equals(v1, v2, true) ? `✔️` : `❌`}`);
  console.log(`coerced: ${equals(v1, v2, false) ? `✔️` : `❌`}`);
  console.log(``);
}

console.log(`--- primitives`);

check(false, false);
check(false, true);
check(true, true);

check(0, false);
check(1, false);
check(0, true);
check(1, true);

check("", false);
check("", true);
check("0", false);
check("0", true);
check("1", false);
check("1", true);
check("x", false);
check("x", true);

check(0, 0);
check(0, 1);
check(1, 1);

check("", 0);
check("", 1);
check("0", 0);
check("0", 1);
check("1", 0);
check("1", 1);
check("x", 0);
check("x", 1);

check("", "");
check("", "x");
check("x", "x");

console.log(`--- arrays`);

[[], [0], [1], ["0"], ["1"], ["x"], [1, 2, 3]].forEach((testArray) => {
  check(false, testArray);
  check(true, testArray);
  check(0, testArray);
  check(1, testArray);
  check("", testArray);
  check("0", testArray);
  check("1", testArray);
  check("x", testArray);
  check(new Set(testArray), testArray);
});

check(
  {
    a: 1,
    b: 2,
  },
  {
    b: 2,
    a: 1,
  }
);
check(
  {
    a: 1,
    b: "2",
  },
  {
    b: 2,
    a: 1,
  }
);
