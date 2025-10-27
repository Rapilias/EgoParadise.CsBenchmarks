using BenchmarkDotNet.Configs;
using BenchmarkDotNet.Jobs;
using BenchmarkDotNet.Running;
using EgoParadise.CsBenchmarks.Benchmarks;

namespace EgoParadise.CsBenchmarks;

public class Program
{
    public static void Main(string[] args)
    {
        var warmupCount = GetIntArg(args, "--warmupCount");
        var iterationCount = GetIntArg(args, "--iterationCount");
        var launchCount = GetIntArg(args, "--launchCount");

        var job = JobMode<Job>.Default;
        if(warmupCount.HasValue)
            job = job.WithWarmupCount(warmupCount.Value);
        if(iterationCount.HasValue)
            job = job.WithIterationCount(iterationCount.Value);
        if(launchCount.HasValue)
            job = job.WithLaunchCount(launchCount.Value);

        IConfig config = DefaultConfig.Instance.AddJob(job);
        BenchmarkRunner.Run(typeof(StringConcatBenchmarks), config);
        BenchmarkRunner.Run(typeof(ForeachBenchmarks), config);
    }

    private static int? GetIntArg(string[] args, string name)
    {
        for(var i = 0; i < args.Length; i++)
        {
            if(string.Equals(args[i], name, StringComparison.OrdinalIgnoreCase))
            {
                if(i + 1 < args.Length && int.TryParse(args[i + 1], out var value))
                    return value;
            }
        }
        return null;
    }
}
