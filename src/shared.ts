import path from 'path'
import { Project } from 'ts-morph'

export function createSharedFile(project: Project, outputDir: string) {
    const sharedFile = project.createSourceFile(
        path.join(outputDir, 'shared.ts'),
        '',
        {
            overwrite: true,
        },
    )
    sharedFile.addImportDeclaration({
        moduleSpecifier: `@prisma/client/runtime`,
        namedImports: [
            'PrismaClientKnownRequestError',
            'PrismaClientUnknownRequestError',
            'PrismaClientRustPanicError',
            'PrismaClientInitializationError',
            'PrismaClientValidationError',
        ],
    })
    sharedFile.addTypeAlias({
        name: 'PrismaClientError',
        type: 'PrismaClientKnownRequestError | PrismaClientUnknownRequestError | PrismaClientRustPanicError | PrismaClientInitializationError | PrismaClientValidationError',
        isExported: true,
    })

    sharedFile.saveSync()
}
