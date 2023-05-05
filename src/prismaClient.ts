import path from 'path'
import { ClassDeclaration, Project, Scope } from 'ts-morph'

export const initializePrismaClient = (outputDir: string, project: Project) => {
    const indexFilePath = path.join(outputDir, 'index.ts')
    const prismaClientFile = project.createSourceFile(indexFilePath, '', {
        overwrite: true,
    })
    prismaClientFile.addImportDeclaration({
        moduleSpecifier: `@prisma/client`,
        namedImports: ['PrismaClient as OGPrismaClient'],
    })

    prismaClientFile.addImportDeclaration({
        moduleSpecifier: 'neverthrow',
        namedImports: ['ResultAsync'],
    })

    const prismaClientClass = prismaClientFile.addClass({
        name: `PrismaClient`,
        isExported: true,
    })
    prismaClientClass.addProperty({
        name: 'prisma',
        type: 'OGPrismaClient',
        scope: Scope.Public,
    })

    const constructor = prismaClientClass.addConstructor({
        parameters: [
            {
                name: 'prisma',
                type: 'OGPrismaClient',
                hasQuestionToken: true,
            },
        ],
    })

    constructor.setBodyText((writer) => {
        writer
            .write('if (prisma)')
            .block(() => {
                writer.writeLine('this.prisma = prisma')
            })
            .write('else')
            .block(() => {
                writer.writeLine(`this.prisma = new OGPrismaClient()`)
            })
    })

    addRawFns(prismaClientClass)

    return {
        prismaClientClass,
        prismaClientFile,
    }
}

function addRawFns(classDeclaration: ClassDeclaration) {
    const actions = [`$queryRaw`, `$queryRawUnsafe`]
    for (const action of actions) {
        const fn = classDeclaration.addMethod({
            name: `${action}`,
            parameters: [
                { name: '...args', type: `Parameters<OGPrismaClient['${action}']>` },
            ],
            typeParameters: [{ name: 'T', default: 'unknown' }],
        })
        fn.setBodyText((writer) =>
            writer
                .writeLine(
                    `const res = ResultAsync.fromPromise(this.prisma.${action}<T>(...args), (e: any) => e.message)`,
                )
                .write('return res'),
        )
    }
}

export function addModelAssignments(
    prismaClientClass: ClassDeclaration,
    properties: string[],
) {
    const constructor = prismaClientClass.getConstructors()[0]
    constructor.addStatements((writer) => {
        for (const modelInstanceProperty of properties) {
            writer.writeLine(modelInstanceProperty)
        }
    })
}
