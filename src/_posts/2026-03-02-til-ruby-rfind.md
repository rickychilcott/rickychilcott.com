---
published: 2026-03-02
layout: post
title: "TIL: Ruby's rfind"
tags:
  - ruby
  - til
abstract: Ruby 4.0 added Array#rfind — a cleaner, more memory-efficient way to find the last matching element without reversing the array first.
kind: technical
sitemap: true
---

I learned about `Array#rfind` today because [Standard Ruby](https://github.com/standardrb/standard) just shipped a lint rule for it. Before Ruby 4.0, if you wanted the last element matching a condition, you'd write:

```ruby
numbers = [2, 3, 4, 6, 7, 8]
numbers.reverse.find(&:odd?)
#=> 7
```

That works fine, but `reverse` allocates a whole new array just to throw it away. `rfind` does the same thing by iterating backwards without the intermediate allocation:

```ruby
numbers.rfind(&:odd?)
#=> 7
```

It lives on `Array` specifically (not `Enumerable`) because arrays can be traversed backwards efficiently at the VM level — `Enumerable` only has `#each` going forward.

For small arrays the difference is negligible, but it reads better and the intent is clearer. And for large arrays, you're not creating a throwaway copy in memory.

Thanks to [Kevin Newton](https://kddnewton.com/) for the work on this, and to [Andy Croll's writeup](https://andycroll.com/ruby/find-the-last-matching-element-with-rfind/) for a good reference.