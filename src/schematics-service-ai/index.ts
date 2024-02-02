import {
    apply, applyTemplates,
    MergeStrategy,
    mergeWith, move,
    type Rule,
    type SchematicContext,
    type Tree,
    url,
} from '@angular-devkit/schematics';
import {resolve} from 'path';
import {normalize, strings} from "@angular-devkit/core";
import {ServiceAIOptions} from "./schema";
import * as path from "path";

export function schematicsServiceAi(options: ServiceAIOptions): Rule {
    return (_tree: Tree, context: SchematicContext) => {
        context.logger.info('Creating service-ai from schematics. Settings: ' + JSON.stringify(options));

        const templateSource = apply(
            url(resolve(__dirname, 'files')),
            [
                applyTemplates({
                    underscore: strings.underscore,
                    ...options
                }),
                move(path.join(options.destinationPath, options.serviceName)),
                renameFile(options)
            ],
        )

        return mergeWith(templateSource, MergeStrategy.Overwrite);
    };
}

function renameFile(options: ServiceAIOptions): Rule {
    return (tree: Tree) => {
        tree.getDir(options.destinationPath).subfiles.forEach((file) => {
                const fileName = file.split(path.sep).pop();
                if(fileName?.startsWith('_')) {
                    tree.rename(
                        normalize(`${options.destinationPath}/${fileName}`),
                        normalize(`${options.destinationPath}/${fileName.replace('_', '.')}`),
                    );
            }
        });
        return tree;
    };
}
