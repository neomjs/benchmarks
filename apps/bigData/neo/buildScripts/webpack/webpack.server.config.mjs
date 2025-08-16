export default {
    mode: 'production',

    devServer: {
        port: 8080,
        static: {
            directory: process.cwd(),
            watch    : false
        }
    }
};
