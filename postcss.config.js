const cssnano = {
  preset: [
    'default',
    {
      discardComments: {
        removeAll: true,
      },
    },
  ],
}

export default {
  plugins: {
    tailwindcss: {},
    ...(process.env.NODE_ENV !== 'production' ? {} : { cssnano }),
  },
}
