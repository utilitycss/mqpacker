import { Plugin, ChildNode, AtRule, list } from "postcss";
import postcssFn from "postcss";

const PLUGIN_NAME = "utilitycss-css-mqpacker";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")(PLUGIN_NAME);

const isSourceMapAnnotation = (node: ChildNode): boolean => {
  if (!node) {
    return false;
  }

  if (node.type !== "comment") {
    return false;
  }

  if (node.type.toLowerCase().indexOf(" sourcemappingurl=") !== 0) {
    return false;
  }

  return true;
};

interface Expressions {
  [key: string]: boolean | string[];
}

const inspectLength = (length: string): number => {
  if (length === "0") {
    return 0;
  }

  const matches = /(-?\d*\.?\d+)(ch|em|ex|px|rem)/.exec(length);

  if (!matches) {
    return Number.MAX_VALUE;
  }

  matches.shift();
  const [num, unit] = matches;
  let newNum: number;

  switch (unit) {
    case "ch":
      newNum = parseFloat(num) * 8.8984375;
      break;
    case "em":
    case "rem":
      newNum = parseFloat(num) * 16;
      break;
    case "ex":
      newNum = parseFloat(num) * 8.296875;
      break;
    case "px":
      newNum = parseFloat(num);
      break;
  }

  return newNum;
};

const pickMinimumMinWidth = (expressions: Expressions[]): number => {
  const minWidths: number[] = [];

  expressions.forEach((feature) => {
    let minWidth = feature["min-width"];

    if (!minWidth || feature.not || feature.print) {
      minWidth = [null];
    }

    minWidths.push(
      (minWidth as string[]).map(inspectLength).sort((a, b) => b - a)[0]
    );
  });

  return minWidths.sort((a, b) => a - b)[0];
};

const parseQueryList = (queryList: string): Expressions[] => {
  const queries: Expressions[] = [];

  list.comma(queryList).forEach((query) => {
    const expressions: Expressions = {};

    list.space(query).forEach((expression) => {
      const newExpression = expression.toLowerCase();

      if (newExpression === "and") {
        return;
      }

      if (/^\w+$/.test(newExpression)) {
        expressions[newExpression] = true;
        return;
      }

      const [feature, value] = newExpression.replace(/^\(|\)$/g, "").split(":");
      if (!expressions[feature]) {
        expressions[feature] = [];
      }

      (expressions[feature] as string[]).push(value.trim());
    });

    queries.push(expressions);
  });

  return queries;
};

const sortQueryLists = (queryLists: string[], sort: any): string[] => {
  const mapQueryLists: Expressions[][] = [];
  if (!sort) {
    return queryLists;
  }

  if (typeof sort === "function") {
    return queryLists.sort(sort);
  }

  queryLists.forEach((queryList) => {
    mapQueryLists.push(parseQueryList(queryList));
  });

  return mapQueryLists
    .map((expressions, index) => ({
      index,
      value: pickMinimumMinWidth(expressions),
    }))
    .sort((a, b) => a.value - b.value)
    .map((e) => queryLists[e.index]);
};

type SortCompareFunction<T = string> = (a: T, b: T) => number;
type Sort = boolean | SortCompareFunction;

interface PluginOptions {
  sort?: Sort;
}

const plugin = (opts: PluginOptions): Plugin => {
  return {
    postcssPlugin: PLUGIN_NAME,
    Once(root) {
      const queries: {
        [key: string]: AtRule;
      } = {};
      const queryLists: string[] = [];

      let sourceMap = root.last;

      if (!isSourceMapAnnotation(sourceMap)) {
        sourceMap = null;
      }

      root.walkAtRules("media", (atRule) => {
        if (atRule.parent.parent && atRule.parent.parent.type !== "root") {
          return;
        }

        if (atRule.parent.type !== "root") {
          const newAtRule = postcssFn.atRule({
            name: (atRule.parent as AtRule).name,
            params: (atRule.parent as AtRule).params,
          });

          atRule.each((rule) => {
            newAtRule.append(rule);
          });

          atRule.remove();
          atRule.removeAll();
          atRule.append(newAtRule);
        }

        const queryList = atRule.params;
        const past = queries[queryList];

        if (typeof past === "object") {
          atRule.each((rule) => {
            past.append(rule.clone());
          });
        } else {
          queries[queryList] = atRule.clone();
          queryLists.push(queryList);
        }

        atRule.remove();
      });

      sortQueryLists(queryLists, opts?.sort).forEach((queryList) => {
        root.append(queries[queryList]);
      });

      if (sourceMap) {
        root.append(sourceMap);
      }
    },
  };
};
export default plugin;

export const postcss = true;
