import axios from 'axios';
import { Command } from 'commander';

interface RunReport {
  projectId: string;
  total: number;
  passed: number;
  failed: number;
  results: Array<{
    id: string;
    name: string;
    status: number;
    duration: number;
    success: boolean;
  }>;
}

interface CliOptions {
  projectId: string;
  envId?: string;
  apiUrl: string;
  token: string;
}

const program = new Command();

program
  .name('initqa-run')
  .description('CLI for running .initQA test suites in CI/CD pipelines')
  .version('1.0.0')
  .requiredOption('-p, --project-id <id>', 'Project ID to execute')
  .option('-e, --env-id <id>', 'Target Environment ID')
  .option('-u, --api-url <url>', 'API Base URL', 'http://localhost:3000')
  .option(
    '-t, --token <token>',
    'Authentication Token (or use INITQA_TOKEN env)',
    process.env.INITQA_TOKEN,
  )
  .action(async (options: CliOptions) => {
    const { projectId, envId, apiUrl, token } = options;

    if (!token) {
      console.error(
        'Error: Authentication token is required via --token or INITQA_TOKEN env',
      );
      process.exit(3); // Configuration Error
    }

    console.log(`\n🚀 .initQA CI Runner - Project: ${projectId}`);
    if (envId) console.log(`🌍 Target Environment: ${envId}`);

    try {
      const response = await axios.post<RunReport>(
        `${apiUrl.replace(/\/$/, '')}/api/projects/${projectId}/run-all`,
        { environmentId: envId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const report = response.data;
      console.log('\n--- EXECUTION SUMMARY ---');
      console.log(`✅ Passed: ${report.passed}`);
      console.log(`❌ Failed: ${report.failed}`);
      console.log(`📊 Total:  ${report.total}`);
      console.log('-------------------------\n');

      report.results.forEach((res) => {
        const icon = res.success ? '✅' : '❌';
        console.log(`${icon} [${res.status}] ${res.name} (${res.duration}ms)`);
      });

      if (report.failed > 0) {
        console.error(
          '\n💥 Build failed: drift or validation errors detected.',
        );
        process.exit(1); // Test Failure
      } else {
        console.log('\n✨ Build passed! No structural violations found.');
        process.exit(0); // Success
      }
    } catch (err: unknown) {
      let message = 'Unknown error';
      let exitCode = 2; // Default to Infrastructure Error

      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data as
          | { message?: string }
          | undefined;
        message = responseData?.message || err.message;
        
        // If it's a 4xx error (e.g. 401, 404), maybe it's config?
        // But strictly, if the API is reachable but returns error, it might be config or infra.
        // Let's keep 401/403 as Config (3)
        if (err.response?.status === 401 || err.response?.status === 403) {
             exitCode = 3;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      console.error('\n❌ Execution failed:', message);
      process.exit(exitCode);
    }
  });

program.parse(process.argv);
