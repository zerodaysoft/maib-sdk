/** SDK version, injected from package.json at build time via tsup `define`. */
declare const PKG_VERSION: string;
export const SDK_VERSION: string = PKG_VERSION;
