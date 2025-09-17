---
published: 2025-09-22
layout: post
title: PostgreSQL Indexing Strategies for JSONB Columns
tags:
  - postgresql
  - database
  - optimization
  - indexing
  - jsonb
  - performance
abstract: A practical guide to optimizing PostgreSQL JSONB queries through strategic indexing. Learn when to use GIN indexes, expression indexes, and partial indexes with real-world performance examples.
kind: technical
sitemap: true
---
Database optimization is often an afterthought until performance becomes a problem. When working with PostgreSQL's JSONB columns, understanding indexing strategies can mean the difference between sub-second queries and painfully slow operations.

In this article, we'll explore different indexing approaches for JSONB columns, using real performance data from a production application to demonstrate the impact of each strategy.

## The Baseline: Unoptimized Queries

Let's start with a common scenario: finding all organization settings that have a specific feature enabled. Our initial query looks like this:

```ruby
OrganizationSetting.setting_equals(allow_goal_request_mailers: true)
```

On a small dataset (less than 2,000 rows), this query performs reasonably well:

```sql
EXPLAIN SELECT "organization_settings".* FROM "organization_settings"
WHERE "organization_settings"."deleted_at" IS NULL
AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]

                                            QUERY PLAN
--------------------------------------------------------------------------------------------------
 Seq Scan on organization_settings  (cost=0.00..113.47 rows=1 width=906)
   Filter: ((deleted_at IS NULL) AND (settings @> '{"allow_goal_request_mailers": true}'::jsonb))
```

**Execution time: ~10ms** - Not bad for a small dataset, but this is a sequential scan that will degrade linearly with data growth.

## Scaling the Problem

Let's see what happens when we scale up the data. Adding 200,000 rows to our test:

```ruby
200_000.times { OrganizationSetting.create(owner: Organization.first) }
```

The same query now takes significantly longer:

```sql
EXPLAIN SELECT "organization_settings".* FROM "organization_settings"
WHERE "organization_settings"."deleted_at" IS NULL
AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]

                                               QUERY PLAN
--------------------------------------------------------------------------------------------------------
 Gather  (cost=1000.00..20955.71 rows=753 width=710)
   Workers Planned: 2
   ->  Parallel Seq Scan on organization_settings  (cost=0.00..19880.41 rows=314 width=710)
         Filter: ((deleted_at IS NULL) AND (settings @> '{"allow_goal_request_mailers": true}'::jsonb))
```

**Execution time: ~100ms** - PostgreSQL is using parallel workers, but we're still doing a sequential scan across the entire table.

## Strategy 1: GIN Indexes

The most common approach for JSONB columns is to add a GIN (Generalized Inverted Index) index:

```ruby
add_index :organization_settings, :settings, using: :gin, name: :idx_org_settings_settings_gin
```

This creates an index that can efficiently handle JSONB containment queries (`@>`, `?`, `?&`, `?|`).

Let's test the performance:

```sql
EXPLAIN SELECT "organization_settings".* FROM "organization_settings"
WHERE "organization_settings"."deleted_at" IS NULL
AND (settings @> $1) [[nil, "{\"allow_goal_request_mailers\":true}"]]

                                          QUERY PLAN
-----------------------------------------------------------------------------------------------
 Bitmap Heap Scan on organization_settings  (cost=49.93..2578.94 rows=753 width=710)
   Recheck Cond: (settings @> '{"allow_goal_request_mailers": true}'::jsonb)
   Filter: (deleted_at IS NULL)
   ->  Bitmap Index Scan on idx_org_settings_settings_gin  (cost=0.00..49.74 rows=754 width=0)
         Index Cond: (settings @> '{"allow_goal_request_mailers": true}'::jsonb)
```

**Execution time: ~300ms** - Wait, that's slower! What's happening here?

### The GIN Index Paradox

Initially, the GIN index appears slower because:

1. The index needs to be built and maintained
2. PostgreSQL's query planner might not have updated statistics
3. The index is being used, but the overhead of the bitmap scan is higher than a simple sequential scan for this data size

After running `ANALYZE` to update statistics:

```ruby
ActiveRecord::Base.connection.execute("ANALYZE organization_settings;")
```

The performance improves back to around 100ms, similar to the parallel sequential scan.

## Strategy 2: Expression Indexes

For frequently queried specific fields, expression indexes can be more targeted and efficient:

```ruby
ActiveRecord::Base.connection.execute(<<~SQL)
  CREATE INDEX CONCURRENTLY idx_org_settings_allow_mailers_true
    ON organization_settings (((settings->>'allow_goal_request_mailers')::boolean))
    WHERE deleted_at IS NULL;
SQL
```

This creates an index specifically for the `allow_goal_request_mailers` field, with a partial index condition to exclude soft-deleted records.

Now we need to adjust our query to match the index:

```ruby
OrganizationSetting.where("(settings->>'allow_goal_request_mailers')::boolean IS TRUE")
```

The performance improvement is dramatic:

```sql
EXPLAIN SELECT "organization_settings".* FROM "organization_settings"
WHERE "organization_settings"."deleted_at" IS NULL
AND (((settings->>'allow_goal_request_mailers')::boolean) IS TRUE)

                                                         QUERY PLAN
----------------------------------------------------------------------------------------------------------------------------
 Index Scan using idx_org_settings_allow_mailers_true on organization_settings  (cost=0.43..55297.85 rows=1506824 width=98)
   Index Cond: (((settings ->> 'allow_goal_request_mailers'::text))::boolean = true)
```

**Execution time: <10ms** - That's a 10x improvement!

## Strategy 3: Partial Indexes

Partial indexes are particularly useful when you only need to index a subset of your data:

```ruby
# Index only active settings with specific features
add_index :organization_settings,
  "((settings->>'show_logo')::boolean)",
  where: "deleted_at IS NULL AND (settings->>'show_logo')::boolean = true",
  name: "idx_active_orgs_with_logo"
```

This approach:

- Reduces index size by only indexing relevant rows
- Improves query performance for specific conditions
- Reduces maintenance overhead

## Strategy 4: Composite Indexes

For queries that filter on multiple conditions, composite indexes can be effective:

```ruby
add_index :organization_settings,
  [:owner_type, :owner_id, "((settings->>'show_logo')::boolean)"],
  where: "deleted_at IS NULL",
  name: "idx_org_settings_composite"
```

This index supports queries that filter by owner and specific JSONB fields simultaneously.

## Performance Comparison Summary

| Strategy         | Index Size | Query Time (200K rows) | Use Case                               |
| ---------------- | ---------- | ---------------------- | -------------------------------------- |
| No Index         | N/A        | ~100ms                 | Small datasets, infrequent queries     |
| GIN Index        | Large      | ~100ms                 | General JSONB queries, multiple fields |
| Expression Index | Small      | <10ms                  | Specific field queries, high frequency |
| Partial Index    | Smallest   | <5ms                   | Specific conditions, targeted queries  |

## When to Use Each Strategy

### Use GIN Indexes When:

- You query multiple different JSONB fields
- You need support for containment operators (`@>`, `?`, `?&`, `?|`)
- You have sufficient storage for the larger index size
- Query patterns are unpredictable

### Use Expression Indexes When:

- You frequently query specific JSONB fields
- You need maximum performance for those queries
- You can afford to create multiple indexes
- Query patterns are well-defined

### Use Partial Indexes When:

- You only need to index a subset of rows
- You want to minimize index size and maintenance overhead
- Your queries have consistent WHERE conditions

## Best Practices

### 1. Measure Before Optimizing

Always use `EXPLAIN ANALYZE` to understand your current query performance before adding indexes.

### 2. Consider Index Maintenance

More indexes mean slower writes and more storage usage. Balance query performance against write performance.

### 3. Use CONCURRENTLY for Production

When adding indexes to production tables, use `CREATE INDEX CONCURRENTLY` to avoid blocking writes:

```ruby
ActiveRecord::Base.connection.execute(<<~SQL)
  CREATE INDEX CONCURRENTLY idx_org_settings_allow_mailers_true
    ON organization_settings (((settings->>'allow_goal_request_mailers')::boolean))
    WHERE deleted_at IS NULL;
SQL
```

### 4. Monitor Index Usage

Regularly check which indexes are actually being used:

```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 5. Consider Alternative Approaches

Sometimes the best optimization is to restructure your data:

```ruby
# Instead of querying JSONB frequently, consider extracting to columns
add_column :organization_settings, :show_logo, :boolean, default: false
add_column :organization_settings, :enable_links, :boolean, default: true

# Keep JSONB for less frequently queried settings
```

## Conclusion

PostgreSQL's JSONB indexing capabilities are powerful, but they require thoughtful strategy. The key is to understand your query patterns and choose the right indexing approach for each use case.

Start with GIN indexes for general JSONB queries, then add expression indexes for frequently accessed specific fields. Use partial indexes to optimize for common query conditions, and always measure the impact of your optimizations.

Remember: the best index is the one that solves your actual performance problems, not the one that looks most impressive in theory.
