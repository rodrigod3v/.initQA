import axios from 'axios';

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

async function run() {
  const args = process.argv.slice(2);
  const projectIdIdx = args.indexOf('--project-id');
  const envIdIdx = args.indexOf('--env-id');
  const apiUrlIdx = args.indexOf('--api-url');
  const tokenIdx = args.indexOf('--token');

  const projectId = projectIdIdx !== -1 ? args[projectIdIdx + 1] : null;
  const envId = envIdIdx !== -1 ? args[envIdIdx + 1] : undefined;
  const apiUrl =
    apiUrlIdx !== -1 ? args[apiUrlIdx + 1] : 'http://localhost:3000';
  const token = tokenIdx !== -1 ? args[tokenIdx + 1] : process.env.INITQA_TOKEN;

  if (!projectId) {
    console.error('Error: --project-id is required');
    process.exit(1);
  }

  if (!token) {
    console.error(
      'Error: --token or INITQA_TOKEN environment variable is required',
    );
    process.exit(1);
  }

  console.log(`🚀 Starting .initQA CI Runner for project: ${projectId}`);
  if (envId) console.log(`🌍 Target Environment: ${envId}`);

  try {
    const response = await axios.post(
      `${apiUrl}/projects/${projectId}/run-all`,
      {
        environmentId: envId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    const report = response.data as RunReport;
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
      console.error('\n💥 Build failed: drift or validation errors detected.');
      process.exit(1);
    } else {
      console.log('\n✨ Build passed! No structural violations found.');
      process.exit(0);
    }
  } catch (err: unknown) {
    let message = 'Unknown error';
    if (err && typeof err === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if ('response' in (err as any) && (err as any).response?.data?.message) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message = String((err as any).response.data.message);
      } else if ('message' in (err as any)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        message = String((err as any).message);
      }
    }
    console.error('\n❌ Execution failed:', message);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Unexpected error in CI runner:', err);
  process.exit(1);
});
