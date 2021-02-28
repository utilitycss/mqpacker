import { Plugin } from "postcss";
declare type SortCompareFunction<T = string> = (a: T, b: T) => number;
declare type Sort = boolean | SortCompareFunction;
interface PluginOptions {
    sort?: Sort;
}
declare const plugin: (opts: PluginOptions) => Plugin;
export default plugin;
export declare const postcss = true;
