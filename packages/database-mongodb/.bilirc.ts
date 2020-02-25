type Config = import('bili').Config

const config: Config = {
  input: ['src/index.ts'],
  output: {
    dir: 'lib',
    format: ['cjs']
  }
}

export default config
