import {
    apply,
    MergeStrategy,
    mergeWith, move,
    type Rule,
    type SchematicContext, template,
    type Tree,
    url,
} from '@angular-devkit/schematics';
import {normalize, strings} from "@angular-devkit/core";
import {ServiceAIOptions} from "./schema";
import * as path from "path";

export function schematicsServiceAi(options: ServiceAIOptions): Rule {
    const destinationFolder = path.join(options.destinationPath, options.serviceName);
    return (_tree: Tree, context: SchematicContext) => {
        context.logger.info('Creating service-ai from schematics. Settings: ' + JSON.stringify(options));

        const templateSource = apply(
            url(normalize('files')),
            [
                template({
                    underscore: strings.underscore,
                    ...options
                }),
                move(destinationFolder),
                renameFile(destinationFolder)
            ],
        )

        return mergeWith(templateSource, MergeStrategy.Overwrite);
    };
}

function renameFile(folder: string): Rule {
    return (tree: Tree) => {
        tree.getDir(folder).subfiles.forEach((file) => {
            const fileName = file.split(path.sep).pop();
            if (fileName?.startsWith('_')) {
                tree.rename(
                    normalize(`${folder}/${fileName}`),
                    normalize(`${folder}/${fileName.replace('_', '.')}`),
                );
            }
        });
        return tree;
    };
}
