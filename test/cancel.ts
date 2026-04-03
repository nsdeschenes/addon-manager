import {mock} from 'bun:test';

mock.module('@clack/prompts', () => ({
  cancel: mock(() => {}),
}));
