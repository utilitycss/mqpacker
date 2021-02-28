"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postcss = void 0;
const postcss_1 = require("postcss");
const postcss_2 = __importDefault(require("postcss"));
const PLUGIN_NAME = "utilitycss-css-mqpacker";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const debug = require("debug")(PLUGIN_NAME);
const isSourceMapAnnotation = (node) => {
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
const inspectLength = (length) => {
    if (length === "0") {
        return 0;
    }
    const matches = /(-?\d*\.?\d+)(ch|em|ex|px|rem)/.exec(length);
    if (!matches) {
        return Number.MAX_VALUE;
    }
    matches.shift();
    const [num, unit] = matches;
    let newNum;
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
const pickMinimumMinWidth = (expressions) => {
    const minWidths = [];
    expressions.forEach((feature) => {
        let minWidth = feature["min-width"];
        if (!minWidth || feature.not || feature.print) {
            minWidth = [null];
        }
        minWidths.push(minWidth.map(inspectLength).sort((a, b) => b - a)[0]);
    });
    return minWidths.sort((a, b) => a - b)[0];
};
const parseQueryList = (queryList) => {
    const queries = [];
    postcss_1.list.comma(queryList).forEach((query) => {
        const expressions = {};
        postcss_1.list.space(query).forEach((expression) => {
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
            expressions[feature].push(value.trim());
        });
        queries.push(expressions);
    });
    return queries;
};
const sortQueryLists = (queryLists, sort) => {
    const mapQueryLists = [];
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
const plugin = (opts) => {
    return {
        postcssPlugin: PLUGIN_NAME,
        Once(root) {
            const queries = {};
            const queryLists = [];
            let sourceMap = root.last;
            if (!isSourceMapAnnotation(sourceMap)) {
                sourceMap = null;
            }
            root.walkAtRules("media", (atRule) => {
                if (atRule.parent.parent && atRule.parent.parent.type !== "root") {
                    return;
                }
                if (atRule.parent.type !== "root") {
                    const newAtRule = postcss_2.default.atRule({
                        name: atRule.parent.name,
                        params: atRule.parent.params,
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
                }
                else {
                    queries[queryList] = atRule.clone();
                    queryLists.push(queryList);
                }
                atRule.remove();
            });
            sortQueryLists(queryLists, opts === null || opts === void 0 ? void 0 : opts.sort).forEach((queryList) => {
                root.append(queries[queryList]);
            });
            if (sourceMap) {
                root.append(sourceMap);
            }
        },
    };
};
exports.default = plugin;
exports.postcss = true;
//# sourceMappingURL=index.js.map