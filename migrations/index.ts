import * as migration_20251105_060547 from './20251105_060547';
import * as migration_20251111_050900_add_search_indexes from './20251111_050900_add_search_indexes';
import * as migration_20251111_102222_add_art_search_indexes from './20251111_102222_add_art_search_indexes';
import * as migration_20251112_224319 from './20251112_224319';
import * as migration_20251114_001817 from './20251114_001817';
import * as migration_20251118_031355 from './20251118_031355';

export const migrations = [
  {
    up: migration_20251105_060547.up,
    down: migration_20251105_060547.down,
    name: '20251105_060547',
  },
  {
    up: migration_20251111_050900_add_search_indexes.up,
    down: migration_20251111_050900_add_search_indexes.down,
    name: '20251111_050900_add_search_indexes',
  },
  {
    up: migration_20251111_102222_add_art_search_indexes.up,
    down: migration_20251111_102222_add_art_search_indexes.down,
    name: '20251111_102222_add_art_search_indexes',
  },
  {
    up: migration_20251112_224319.up,
    down: migration_20251112_224319.down,
    name: '20251112_224319',
  },
  {
    up: migration_20251114_001817.up,
    down: migration_20251114_001817.down,
    name: '20251114_001817',
  },
  {
    up: migration_20251118_031355.up,
    down: migration_20251118_031355.down,
    name: '20251118_031355'
  },
];
