// shinjuku-shield/seller: loads the seller library at the call. The library imports the x402 packages from the seller's own
// install, and a static import of a missing one would stop the server with a bare module error before any of our text runs.
// This package is already there, at the version seller setup named, so the line does not name it (npm's default version can be older).
const INSTALL_LINE = "npm install express @x402/express@2.27.0 @x402/svm@2.27.0";

export async function createShinjukuSeller(options) {
  let library;
  try {
    library = await import("./shinjuku-seller.mjs");
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && /'(@x402\/[a-z]+|express)'/.test(String(error.message))) {
      throw new Error(`seller_x402_missing: your server's folder does not have the packages this library needs; run ${INSTALL_LINE} there`);
    }
    throw error;
  }
  return library.createShinjukuSeller(options);
}
