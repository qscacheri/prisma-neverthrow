import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { Project } from 'ts-morph'
import { createModel } from './model'
import { addModelAssignments, initializePrismaClient } from './prismaClient'
import { createSharedFile } from './shared'

const { version } = require('../package.json')

const defaultOutputDir = 'node_modules/@generated/prisma-neverthrow'

generatorHandler({
    onManifest() {
        return {
            version,
            defaultOutput: defaultOutputDir,
            prettyName: 'Prisma Neverthrow Generator',
        }
    },
    onGenerate: async (options: GeneratorOptions) => {
        const project = new Project({})
        const outputDir = options.generator.output?.value ?? defaultOutputDir

        createSharedFile(project, outputDir)

        const { prismaClientFile, prismaClientClass } = initializePrismaClient(
            outputDir,
            project,
        )

        const modelInstanceProperties: string[] = []

        options.dmmf.datamodel.models.forEach(async (modelInfo) => {
            const modelName = modelInfo.name

            const instanceProperty = createModel(
                modelName,
                project,
                outputDir,
                prismaClientFile,
                prismaClientClass,
            )

            modelInstanceProperties.push(instanceProperty)
        })

        addModelAssignments(prismaClientClass, modelInstanceProperties)

        prismaClientFile.saveSync()
    },
})
