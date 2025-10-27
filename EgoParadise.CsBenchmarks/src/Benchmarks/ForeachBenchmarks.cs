using BenchmarkDotNet.Attributes;

namespace EgoParadise.CsBenchmarks.Benchmarks;

[MemoryDiagnoser]
[AsciiDocExporter]
[JsonExporterAttribute.BriefCompressed]
[JsonExporterAttribute.FullCompressed]
public class ForeachBenchmarks
{
    private int[] _array = [];
    private Dictionary<int, int> _dictionary = new  Dictionary<int, int>();
    private HashSet<int> _hashSet = new HashSet<int>();
    private List<int> _list = new List<int>();

    [GlobalSetup]
    public void Setup()
    {
        this._array = new int[10000];
        this._list = new List<int>(10000);
        this._hashSet = new HashSet<int>();
        this._dictionary = new Dictionary<int, int>(10000);
        for(var i = 0; i < 10000; i++)
        {
            this._array[i] = i;
            this._list.Add(i);
            this._hashSet.Add(i);
            this._dictionary[i] = i;
        }
    }

    [Benchmark(Description = "int[] の foreach")]
    public int ForeachArray()
    {
        var sum = 0;
        foreach(var item in this._array)
            sum += item;
        return sum;
    }

    [Benchmark(Description = "List<int> の foreach")]
    public int ForeachList()
    {
        var sum = 0;
        foreach(var item in this._list)
            sum += item;
        return sum;
    }

    [Benchmark(Description = "HashSet<int> の foreach")]
    public int ForeachHashSet()
    {
        var sum = 0;
        foreach(var item in this._hashSet)
            sum += item;
        return sum;
    }

    [Benchmark(Description = "Dictionary<int, int> の foreach")]
    public int ForeachDictionary()
    {
        var sum = 0;
        foreach(var kvp in this._dictionary)
            sum += kvp.Value;
        return sum;
    }
}
