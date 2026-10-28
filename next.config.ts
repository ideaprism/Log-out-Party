import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // letter.md는 런타임에 fs로 읽는다. 서버리스 번들에 content/가 빠지지 않게 묶어 둔다.
  outputFileTracingIncludes: {
    '/**': ['./content/**/*'],
  },
};

export default nextConfig;
