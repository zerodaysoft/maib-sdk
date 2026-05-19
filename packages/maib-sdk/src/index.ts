throw new Error(
  '"maib-sdk" has been replaced by "@maib/merchants". Please run:\n\n' +
    "  npm uninstall maib-sdk && npm install @maib/merchants\n\n" +
    "Then update your imports:\n\n" +
    '  import { ... } from "@maib/merchants";\n\n' +
    "Individual merchant-API packages are also available:\n" +
    "  @maib/checkout, @maib/ecommerce, @maib/rtp, @maib/mia\n\n" +
    "Open Banking / PSD2 is a separate, standalone package — NOT part of @maib/merchants:\n" +
    "  @maib/ob",
);
