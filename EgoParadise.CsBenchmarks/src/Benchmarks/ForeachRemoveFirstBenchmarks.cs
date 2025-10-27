using BenchmarkDotNet.Attributes;

namespace EgoParadise.CsBenchmarks.Benchmarks;

[MemoryDiagnoser]
[AsciiDocExporter]
[JsonExporterAttribute.BriefCompressed]
[JsonExporterAttribute.FullCompressed]

public class ForeachRemoveFirstBenchmarks
{
    [Params(100, 1000)]
    public int ElementCount;

    [Params(10, 100)]
    public int RemoveCount;

    private List<int> _list = new List<int>();
    private HashSet<int> _hashSet = new HashSet<int>();

    [GlobalSetup]
    public void Setup()
    {
        this._list = new List<int>(capacity: this.ElementCount);
        this._hashSet = new HashSet<int>();
        for(var i = 0; i < this.ElementCount; i++)
        {
            this._list.Add(i);
            this._hashSet.Add(i);
        }
    }

    [Benchmark(Description = "List<int> を全foreach後に先頭N要素を削除")]
    public int ForeachThenRemoveFirst_List()
    {
        var sum = 0;
        foreach(var item in this._list)
            sum += item;
        // foreach 後に先頭N要素を削除
    var remove = Math.Min(this.RemoveCount, this._list.Count);
        for(int i = 0; i < remove; i++)
        {
            if(this._list.Count > 0)
                this._list.RemoveAt(0);
        }
        return sum;
    }

    [Benchmark(Description = "HashSet<int> を全foreach後に最小値N件削除")]
    public int ForeachThenRemoveFirst_HashSet()
    {
        var sum = 0;
        foreach(var item in this._hashSet)
            sum += item;
        // foreach 後に最小値N件削除
    var remove = Math.Min(this.RemoveCount, this._hashSet.Count);
        for(int i = 0; i < remove; i++)
        {
            if(this._hashSet.Count > 0)
            {
                var min = int.MaxValue;
                foreach(var v in this._hashSet)
                    if(v < min) min = v;
                this._hashSet.Remove(min);
            }
        }
        return sum;
    }

    [Benchmark(Description = "List<int> を全foreach後に先頭N要素をSwapBack削除")]
    public int ForeachThenRemoveFirst_List_RemoveSwapBack()
    {
        var sum = 0;
        foreach(var item in this._list)
            sum += item;
        // foreach 後に先頭N要素をSwapBackで削除（順序は保持しない）
    var remove = Math.Min(this.RemoveCount, this._list.Count);
        for(int i = 0; i < remove; i++)
        {
            if(this._list.Count > 0)
            {
                var lastIndex = this._list.Count - 1;
                this._list[0] = this._list[lastIndex];
                this._list.RemoveAt(lastIndex);
            }
        }
        return sum;
    }
}


