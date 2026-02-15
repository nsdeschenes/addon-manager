import type {Addon} from '../types';

import {formatSizeToString} from './formatSizeToString';

export const renderAddon = (addon: Addon) =>
  `
Title: ${addon.title}
Creator: ${addon.creator}
Size: ${formatSizeToString(addon.size)}
Package Name: ${addon.packageName}
Package Version: ${addon.packageVersion}
Minimum Game Version: ${addon.minimumGameVersion}
Items:
${addon.items.map(item => `  - ${item.type}: ${item.content}`).join('\n')}
`;
