const CracoLessPlugin = require("craco-less");
const AntdDayjsWebpackPlugin = require("antd-dayjs-webpack-plugin");
// const { getThemeVariables } = require("antd/dist/theme");

module.exports = {
    plugins: [
        {
            plugin: CracoLessPlugin,
            options: {
                lessLoaderOptions: {
                    lessOptions: {
                        modifyVars: { "@body-background": "#7e8da4" },
                        // modifyVars: getThemeVariables({ dark: true }),
                        javascriptEnabled: true,
                    },
                },
            },
        },
    ],
    webpack: {
        configure: (webpackConfig) => ({ ...webpackConfig, stats: "none" }),
        plugins: {
            add: [new AntdDayjsWebpackPlugin()],
        },
    },
};
