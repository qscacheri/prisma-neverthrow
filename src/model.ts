import path from 'path'
import { ClassDeclaration, Project, Scope, SourceFile } from 'ts-morph'

const getModelClassName = (modelName: string) => `${modelName}NeverThrow`

export function createModel(
    modelName: string,
    project: Project,
    outputDir: string,
    prismaClientFile: SourceFile,
    prismaClientClass: ClassDeclaration,
) {
    const modelClassName = getModelClassName(modelName)
    const modelFilePath = path.join(outputDir, `${modelClassName}.ts`)
    const modelSourceFile = project.createSourceFile(modelFilePath, '', {
        overwrite: true,
    })

    modelSourceFile.addImportDeclaration({
        moduleSpecifier: '@prisma/client',
        namedImports: ['Prisma', 'PrismaClient as OGPrismaClient'],
    })

    modelSourceFile.addImportDeclaration({
        moduleSpecifier: 'neverthrow',
        namedImports: ['ResultAsync'],
    })

    modelSourceFile.addImportDeclaration({
        moduleSpecifier: './shared',
        namedImports: ['PrismaClientError'],
    })

    createModelClass(modelName, modelSourceFile)

    const lowerCaseModel = modelName.charAt(0).toLowerCase() + modelName.slice(1)

    prismaClientClass.addProperty({
        name: lowerCaseModel,
        type: modelClassName,
        scope: Scope.Public,
    })

    prismaClientFile.addImportDeclaration({
        moduleSpecifier: `./${modelClassName}`,
        namedImports: [modelClassName],
    })

    modelSourceFile.saveSync()
    return `this.${lowerCaseModel} = new ${modelClassName}(this.prisma)`
}

function createModelClass(modelName: string, sourceFile: SourceFile) {
    const modelClass = sourceFile.addClass({
        name: getModelClassName(modelName),
        isExported: true,
    })
    modelClass.addConstructor({
        parameters: [
            {
                name: 'prisma',
                type: 'OGPrismaClient',
                scope: Scope.Private,
                isReadonly: true,
            },
        ],
    })
    const crudActions = [
        'findMany',
        'findFirst',
        'findUnique',
        'create',
        'update',
        'delete',
    ]
    for (const action of crudActions) {
        const lowerCaseModel =
            modelName.charAt(0).toLowerCase() + modelName.slice(1)
        const fn = modelClass.addMethod({
            name: `${action}`,
            parameters: [
                {
                    name: '...args',
                    type: `Parameters<OGPrismaClient['${lowerCaseModel}']['${action}']>`,
                },
            ],
        })
        fn.setBodyText((writer) =>
            writer
                .writeLine(
                    `const res = ResultAsync.fromPromise(this.prisma.${lowerCaseModel}.${action}(...args), (e: unknown) => e as PrismaClientError)`,
                )
                .write('return res'),
        )
    }
}
