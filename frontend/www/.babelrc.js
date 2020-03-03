const isTest = String(process.env.NODE_ENV) === "test";

module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-env": { modules: isTest ? "commonjs" : false },
        "transform-runtime": {},
        "styled-jsx": {},
        "class-properties": {}
      }
    ]
  ],
  plugins: []
};
