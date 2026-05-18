import { z } from "zod";

export const ObUserSchema = z
  .looseObject({
    user_id: z.string().meta({ description: "Stable user identifier within the OBP instance." }),
    email: z.email().meta({ description: "User email address." }),
    provider_id: z.string().meta({
      description: "Identifier issued by the user's identity provider.",
    }),
    provider: z.string().meta({
      description: "Name of the identity provider that authenticated the user.",
    }),
    username: z.string().meta({ description: "Login username." }),
    entitlements: z
      .looseObject({
        list: z
          .array(
            z.looseObject({
              entitlement_id: z.string().meta({ description: "Unique entitlement identifier." }),
              role_name: z.string().meta({ description: "Role granted to the user." }),
              bank_id: z.string().meta({ description: "Bank the role applies to." }),
            }),
          )
          .meta({
            description: "Role grants assigned to the user.",
          }),
      })
      .meta({
        description: "Container for the user's role grants.",
      }),
  })
  .meta({
    id: "maib.ob.ObUser",
    description: "User record exposed by the OBP `/users` endpoints.",
  });

export const ObApiInfoSchema = z
  .looseObject({
    version: z.string().meta({ description: "Long-form OBP API version (e.g. `v5.1.0`)." }),
    version_status: z.string().meta({
      description: "Lifecycle status of this API version (`STABLE`, `DEPRECATED`, ...).",
    }),
    git_commit: z.string().meta({
      description: "Source commit hash the running connector was built from.",
    }),
    connector: z.string().meta({
      description: "Connector backend identifier (e.g. `mapped`, `kafka_*`).",
    }),
    hostname: z.string().meta({ description: "Public hostname serving the API." }),
    local_identity_provider: z.string().meta({
      description: "Default identity provider configured for the instance.",
    }),
    hosted_by: z
      .looseObject({
        organisation: z.string().meta({ description: "Hosting organisation name." }),
        email: z.email().meta({ description: "Hosting organisation contact email." }),
        phone: z.string().meta({ description: "Hosting organisation contact phone." }),
        organisation_website: z.url().meta({
          description: "Hosting organisation website URL.",
        }),
      })
      .meta({ description: "Information about the organisation hosting the API." }),
    hosted_at: z
      .looseObject({
        organisation: z.string().meta({ description: "Data centre operator name." }),
        organisation_website: z.url().meta({ description: "Data centre operator website." }),
      })
      .meta({ description: "Information about the physical hosting location." }),
    energy_source: z
      .looseObject({
        organisation: z.string().meta({ description: "Energy supplier name." }),
        organisation_website: z.url().meta({ description: "Energy supplier website." }),
      })
      .meta({ description: "Information about the energy supplier powering the host." }),
  })
  .meta({
    id: "maib.ob.ObApiInfo",
    description: "Diagnostic information about the running OBP instance.",
  });

export const ObApiVersionSchema = z
  .looseObject({
    urlPrefix: z.string().meta({ description: "URL prefix that routes to this API version." }),
    apiStandard: z.string().meta({
      description: "API standard family this version belongs to (e.g. `OBPv5`).",
    }),
    apiShortVersion: z.string().meta({
      description: "Short label for the API version (e.g. `v5.1.0`).",
    }),
    API_VERSION: z.string().meta({ description: "Canonical API version string." }),
  })
  .meta({
    id: "maib.ob.ObApiVersion",
    description: "API version descriptor used by the OBP discovery endpoints.",
  });
