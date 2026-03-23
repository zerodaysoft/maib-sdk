throw new Error(
  '"maib-sdk" has been replaced by "@maib/merchants". Please run:\n\n' +
    "  npm uninstall maib-sdk && npm install @maib/merchants\n\n" +
    "Then update your imports:\n\n" +
    '  import { ... } from "@maib/merchants";\n\n' +
    "Individual packages are also available:\n" +
    "  @maib/checkout, @maib/ecommerce, @maib/rtp, @maib/mia",
);
