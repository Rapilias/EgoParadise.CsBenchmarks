using System.Text;
using BenchmarkDotNet.Attributes;

namespace EgoParadise.CsBenchmarks;

[MemoryDiagnoser]
[AsciiDocExporter]
[JsonExporterAttribute.BriefCompressed]
[JsonExporterAttribute.FullCompressed]
public class StringConcatBenchmarks
{
    private const string Segment = "abc";
    [Params(10, 100, 1000)]
    public int repeatCount { get; set; }

    [Benchmark(Description = "string に += した場合")]
    public string PlusOperator()
    {
        var result = string.Empty;
        for(var i = 0; i < this.repeatCount; i++)
            result += StringConcatBenchmarks.Segment;
        return result;
    }

    [Benchmark(Description = "StringBuilder.Append(string) した場合")]
    public string StringBuilderAppend()
    {
        var builder = new StringBuilder(capacity: StringConcatBenchmarks.Segment.Length * this.repeatCount);
        for(var i = 0; i < this.repeatCount; i++)
            builder.Append(StringConcatBenchmarks.Segment);
        return builder.ToString();
    }
}
