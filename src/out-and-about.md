---
layout: page
title: Out and About
---

I’ve written articles, delivered presentations, and taken part podcast episodes over the years on a variety of topics. Below is a list of them, along with links and commentary.

<% site.data.externals.sort_by(&:date).reverse.each do |external| %>
  <%= render Article.new(title: external.name,
                         date: external.date,
                         url: external.url,
                         body: markdownify(external.details)) %>
<% end %>