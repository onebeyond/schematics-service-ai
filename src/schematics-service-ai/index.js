"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schematicsServiceAi = void 0;
const schematics_1 = require("@angular-devkit/schematics");
const path_1 = require("path");
const core_1 = require("@angular-devkit/core");
const path = require("path");
function schematicsServiceAi(options) {
    return (_tree, context) => {
        context.logger.info('Creating service-ai from schematics. Settings: ' + JSON.stringify(options));
        const templateSource = (0, schematics_1.apply)((0, schematics_1.url)((0, path_1.resolve)(__dirname, 'files')), [
            (0, schematics_1.applyTemplates)(Object.assign({ underscore: core_1.strings.underscore }, options)),
            (0, schematics_1.move)(path.join(options.destinationPath, options.serviceName)),
            renameFile(options)
        ]);
        return (0, schematics_1.mergeWith)(templateSource, schematics_1.MergeStrategy.Overwrite);
    };
}
exports.schematicsServiceAi = schematicsServiceAi;
function renameFile(options) {
    return (tree) => {
        tree.getDir(options.destinationPath).subfiles.forEach((file) => {
            const fileName = file.split(path.sep).pop();
            if (fileName === null || fileName === void 0 ? void 0 : fileName.startsWith('_')) {
                tree.rename((0, core_1.normalize)(`${options.destinationPath}/${fileName}`), (0, core_1.normalize)(`${options.destinationPath}/${fileName.replace('_', '.')}`));
            }
        });
        return tree;
    };
}
//# sourceMappingURL=index.js.map