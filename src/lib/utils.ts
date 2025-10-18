import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Manifest } from '@farcaster/miniapp-core/src/manifest';
import {
  APP_BUTTON_TEXT,
  APP_DESCRIPTION,
  APP_ICON_URL,
  APP_NAME,
  APP_OG_IMAGE_URL,
  APP_PRIMARY_CATEGORY,
  APP_SPLASH_BACKGROUND_COLOR,
  APP_SPLASH_URL,
  APP_TAGS,
  APP_URL,
  APP_WEBHOOK_URL,
} from './constants';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMiniAppEmbedMetadata(ogImageUrl?: string) {
  return {
    version: 'next',
    imageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    ogTitle: APP_NAME,
    ogDescription: APP_DESCRIPTION,
    ogImageUrl: ogImageUrl ?? APP_OG_IMAGE_URL,
    button: {
      title: APP_BUTTON_TEXT,
      action: {
        type: 'launch_frame',
        name: APP_NAME,
        url: APP_URL,
        splashImageUrl: APP_SPLASH_URL,
        iconUrl: APP_ICON_URL,
        splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
        description: APP_DESCRIPTION,
        primaryCategory: APP_PRIMARY_CATEGORY,
        tags: APP_TAGS,
      },
    },
  };
}

export async function getFarcasterDomainManifest(): Promise<Manifest> {
  return {
  "accountAssociation": {
  "header": "eyJmaWQiOjU2MDM0OSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDBCN0Y3ZGEwMkZlZUM4NkFGNDQ4NkFjNTM1RjQ4NTMyYjFFQzNiMzcifQ",
  "payload": "eyJkb21haW4iOiJ0cmliZXYxLnZlcmNlbC5hcHAifQ",
  "signature": "YOJ8g1b71EZbQQgjJKQvXPNEkVZQAVjaoY+UO+WzNcMoW/NABmF/gdw+Pd6HBfJYlsX3CRetaRWEjmuvEh0pQhs="
},
    miniapp: {
      version: '1',
      name: APP_NAME ?? 'TRIBE',
      subtitle: "LP Yield Copy Trading on Base", 
      description: "A platform for LP yield copy-trading that is based on the Base blockchain allows followers to easily mimic the liquidity provision tactics of successful traders.",
      screenshotUrls: [`${APP_URL}/TRIBE.jpg`],
      primaryCategory: "finance",
      tags: ["defi","crypto","liquidity","copytrading","LP-Yield"],
      heroImageUrl: `${APP_URL}/TRIBE.jpg`,
      tagline: "Join TRIBE Now!",
      ogTitle: "TRIBE",
      ogDescription: "TRIBE: LP Yield Copy Trading on Base",
      ogImageUrl: `${APP_URL}/TRIBE.jpg`,

      homeUrl: APP_URL,
      iconUrl: APP_ICON_URL,
      imageUrl: APP_OG_IMAGE_URL,
      buttonTitle: APP_BUTTON_TEXT ?? 'Launch Mini App',
      splashImageUrl: APP_SPLASH_URL,
      splashBackgroundColor: APP_SPLASH_BACKGROUND_COLOR,
      webhookUrl: APP_WEBHOOK_URL,
    },
    "baseBuilder": {
      "ownerAddress": "0x4ADA72A74E3C6f68542c4a9c6650d2dc25b8EdC3"
    }
  };
}
