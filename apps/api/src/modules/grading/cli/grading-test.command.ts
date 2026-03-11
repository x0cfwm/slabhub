import { Command, CommandRunner, Option } from 'nest-commander';
import { GradingRecognitionService } from '../grading-recognition.service';
import * as fs from 'fs';
import * as path from 'path';

interface GradingTestOptions {
    file: string;
}

@Command({ name: 'grading:test-recognition', description: 'Test image recognition service' })
export class GradingTestCommand extends CommandRunner {
    constructor(private readonly recognitionService: GradingRecognitionService) {
        super();
    }

    async run(passedParam: string[], options?: GradingTestOptions): Promise<void> {
        if (!options?.file) {
            console.error('Error: --file is required');
            return;
        }

        const rawPath = options.file;
        const searchPaths = [
            path.resolve(process.cwd(), rawPath),
            path.resolve(process.cwd(), '..', '..', rawPath), // From apps/api/ to root/
            process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD, rawPath) : null,
            process.env.PWD ? path.resolve(process.env.PWD, rawPath) : null,
        ].filter((p): p is string => !!p);

        const filePath = searchPaths.find(p => fs.existsSync(p));

        if (!filePath) {
            console.error(`Error: File not found: ${rawPath}`);
            console.error(`Current working directory (process.cwd()): ${process.cwd()}`);
            console.error(`INIT_CWD: ${process.env.INIT_CWD || 'not set'}`);
            console.error(`PWD: ${process.env.PWD || 'not set'}`);
            console.error(`Searched in:`);
            [...new Set(searchPaths)].forEach(p => console.error(`  - ${p}`));
            return;
        }

        const buffer = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.webp') mimeType = 'image/webp';

        console.log(`Starting recognition for ${filePath} (${mimeType})...`);
        const result = await this.recognitionService.recognizeFromImage(buffer, mimeType);

        if (result.success) {
            console.log(`Recognition successful! (took ${result.durationMs}ms)`);
            console.log(JSON.stringify(result.data, null, 2));
        } else {
            console.error(`Recognition failed! (took ${result.durationMs}ms)`);
            console.error(result.error);
        }
    }

    @Option({
        flags: '-f, --file <file>',
        description: 'Path to the image file to test',
    })
    parseFile(val: string): string {
        return val;
    }
}
