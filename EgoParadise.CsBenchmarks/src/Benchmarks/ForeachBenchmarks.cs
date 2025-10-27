using BenchmarkDotNet.Attributes;

namespace EgoParadise.CsBenchmarks.Benchmarks;

[MemoryDiagnoser]
[AsciiDocExporter]
[JsonExporterAttribute.BriefCompressed]
[JsonExporterAttribute.FullCompressed]
public class ForeachBenchmarks
{
    private int[] array;
    private Dictionary<int, int> dictionary;
    private HashSet<int> hashSet;
    private List<int> list;

    [GlobalSetup]
    public void Setup()
    {
        this.array = new int[10000];
        this.list = new List<int>(10000);
        this.hashSet = new HashSet<int>();
        this.dictionary = new Dictionary<int, int>(10000);
        for(var i = 0; i < 10000; i++)
        {
            this.array[i] = i;
            this.list.Add(i);
            this.hashSet.Add(i);
            this.dictionary[i] = i;
        }
    }

    [Benchmark]
    public int ForeachArray()
    {
        var sum = 0;
        foreach(var item in this.array)
            sum += item;
        return sum;
    }

    [Benchmark]
    public int ForeachList()
    {
        var sum = 0;
        foreach(var item in this.list)
            sum += item;
        return sum;
    }

    [Benchmark]
    public int ForeachHashSet()
    {
        var sum = 0;
        foreach(var item in this.hashSet)
            sum += item;
        return sum;
    }

    [Benchmark]
    public int ForeachDictionary()
    {
        var sum = 0;
        foreach(var kvp in this.dictionary)
            sum += kvp.Value;
        return sum;
    }
}
