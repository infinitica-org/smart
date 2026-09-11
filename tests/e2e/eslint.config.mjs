import base from '@smart/eslint-config/base';

export default [...base, { ignores: ['playwright-report/**', 'test-results/**'] }];
