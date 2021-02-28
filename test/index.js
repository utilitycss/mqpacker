// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const postcss = require("postcss");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqpacker = require("../dist/index").default;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tape = require("tape");

const pack = function (css, opts) {
  return postcss([mqpacker(opts)]).process(css, opts);
};

tape("Loading test", (test) => {
  const doNothing = postcss.plugin("do-nothing", () => () => "");
  const input = `.foo {
	z-index: 0;
}

@media (min-width:1px) {
	.foo {
		z-index: 1;
	}
}
`;
  const expected = postcss([doNothing]).process(input).css;
  test.plan(2);
  test.equal(postcss([mqpacker()]).process(input).css, expected);
  test.equal(pack(input).css, expected);
  test.end();
});

tape("`sort` option test", (test) => {
  const expected = `.foo {
	z-index: 0;
}

@media (min-width: 1px) {
	.foo {
		z-index: 1;
	}
}

@media (min-width: 2px) {
	.foo {
		z-index: 2;
	}
}
`;
  const input = `.foo {
	z-index: 0;
}

@media (min-width: 2px) {
	.foo {
		z-index: 2;
	}
}

@media (min-width: 1px) {
	.foo {
		z-index: 1;
	}
}
`;
  const opts = {
    sort: true,
  };
  test.plan(4);
  test.notEqual(pack(input).css, expected);
  test.equal(pack(input, opts).css, expected);
  test.notEqual(
    postcss([mqpacker()]).process(input).css,
    postcss([mqpacker(opts)]).process(input).css
  );
  test.equal(
    postcss([
      mqpacker({
        sort: (c, d) => c.localeCompare(d),
      }),
    ]).process(input).css,
    expected
  );
  test.end();
});

tape("Real CSS files", (test) => {
  const readActual = (file) =>
    fs.readFileSync(path.join(__dirname, "actual", file), "utf8");

  const readExpected = (file) =>
    fs.readFileSync(path.join(__dirname, "expected", file), "utf8");

  const testCases = fs.readdirSync(path.join(__dirname, "actual"));
  test.plan(testCases.length);
  testCases.forEach((testCase) => {
    const opts = {};

    if (testCase.startsWith("sort_")) {
      opts.sort = true;
    }

    test.equal(
      postcss([mqpacker(opts)]).process(readActual(testCase)).css,
      readExpected(testCase),
      testCase
    );
  });
  test.end();
});
