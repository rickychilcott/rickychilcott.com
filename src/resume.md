---
template_engine: erb
---
<style><%= File.read(__dir__ + "/resume.css") %></style>

Ricky Chilcott
======

##### Full-stack, product-focused engineer and entrepreneur.
###### Athens, OH | hey@rickychilcott.com | 440-223-5715
###### [www.rickychilcott.com](https://www.rickychilcott.com) | [linkedin.com/in/rickychilcott](https://linkedin.com/in/rickychilcott) | [github.com/rickychilcott](https://github.com/rickychilcott)


SUMMARY
-------

### Job History

- **Co-Founder/CTO - Mission Met** @ Mission Met (2019 - Current)
- **Co-Founder & Principal Software Engineer** @ Rakefire (2011 - Current)
- **Technology and Facilities Manager** @ Scripps College, Ohio University (2009 - 2017)

### Education

- **M.A. in Communication** Ohio University 2016 - Media Management
- **B.S. in Communication** Ohio University 2016 - Audio-Music Production, minor in Business and Music

### Top Technologies
- **Ruby, Rails, JavaScript, Sidekiq, PostgreSQL, Redis, SQLite, Turbo/StimulusJS**

### Additional Experience With
- **AI-LLMs, Node.js, Python, Docker, DevOps, CI/CD, TailwindCSS, Design Systems, UNIX Tools**

### Areas of Interest/Expertise
- Ruby on Rails development
- Web Application Performance and Operational Efficiency
- TDD (Test-driven Development)
- Mentoring Software Engineers
- Online Payments + Subscriptions
- Strategy Planning & Execution
- Running a Business and Solving Problems
- Self-maintaining systems


TECHNICAL SKILLS
----------------

### Programming Languages
**Ruby**, **JavaScript/Node.js**, **Scala**, **Java**, **C/C++**, **HTML**, **CSS**, **UNIX Scripting** (zsh, bash, sh)

### Frameworks
- **Ruby**: Ruby on Rails, Sidekiq, Sinatra, Rack
- **JavaScript/NodeJS**: Turbo/StimulusJS, Webpack, esbuild, React
- **Testing**: RSpec, Jest, Capybara, TDD/Test-driven Testing, Integration Testing
- **Design Systems**: Boostrap, Tailwind CSS, Storybook, ViewComponent, Phlex, Shoelace JS/Web Awesome
- **DevOps**: Docker, Capistrano, Ansible, Puppet

### Architecture/Infrastructure
- **Relational Databases**: PostgreSQL, SQLite, AWS RDS
- **Hosting Platforms**: Render, Heroku, AWS
- **Edge Networking + CDN**: Cloudflare, AWS CloudFront
- **Webserver**: nginx, Caddy
- **WAF + Network Firewall**: Cloudflare, RackAttack, AWS
- **Application Monitoring**: Honeybadger, NewRelic, Skylight, Rollbar
- **Business Intelligence**: Redash, Posthog, Blazer
- **CI/CD**: CircleCI, GitHub Actions, Jenkins

### Operating Systems
**Mac OSX**, **Ubuntu**, **Amazon Linux**, **iOS**, **UNIX Tools**

### Software/Tools
**Bundler**, **Rake**, **Thor**, **Make**, **Jenkins**, **GitHub**, **Asana**


PROFESSIONAL EXPERIENCE
-----------------------

### Co-Founder/CTO - Mission Met
**Athens, OH** (November 2019 - Current)
- Co-founded a bootstraped startup focused on strategic planning software, training, and consulting for mission-driven leaders.
- Designed and built the web-based Causey platform, growing it from concept to $120k ARR and securing partnerships with 10+ strategic planning consultants/firms and over 80 customers.
- Led engineering team management, application architecture, product development, company strategy, and overall process improvement.

#### Notable Projects:
- Built i18n and custom-labeling infrastructure to ensure strategic planning firms could customize for their clients and multi-language support.
- Migrated from hosts from Heroku to Render.com + AWS RDS achieving operational efficiency and 30% cost reductions.
- Developed an affiliate consultant program yielding 10+ ongoing relationships.
- Designed an intential training program that transformed a junior engineer into a competent mid-level contributor within 18 months.

### Co-Founder & Principal Software Engineer - Rakefire
**Athens, OH** (September 2011 - Current)
- Developed in-house products and consulted on Ruby on Rails applications.

#### Notable Projects:
- Developed a solar racking quoting tool for Ecolibrium Solar's EcoX pitched-roof racking product (acquired by [Unirac](https://unirac.com/)).
- Developed a IOT Backend and GraphQL API for [Glow](https://www.kickstarter.com/projects/1178650747/glow-the-smart-energy-tracker-for-your-home).
- Developed the a Healthy Heart score calculation system based on emerging research in food and lifestyle choice for [Ohio University Health Sciences and Professions](https://www.ohio.edu/chsp/).
- Developed a Radio Signal Visualizer Map for emergency radio comunication across the state of Ohio.
- Developed a basic web-based digital signage platform and equipment check-in/check-out system for the [Ohio University Patton College of Education](https://www.ohio.edu/education/).

### Technology and Facilities Manager - Ohio Univesrsity Scripps College of Communication
**Athens, OH** (March 2009 - October 2017)
Oversaw the IT and Technical Production Operations for the Scripps College of Communication.

- Managed, hired, and trained full-time IT staff and part-time student staff to maintain labs, staff computers, and equipment rooms.
- Oversaw the security, patch management, configuration management, etc of 200+ faculty/staff computers and 200 computer lab machines across the college, in addition to several specialized video and audio studios and media suites.
- Automated software deployment through Munki, Munkiserver, shell and python scripts, Windows GPOs, and other configuration technologies.
- Managed a $500k annual budget for multiple college departments and led $120k in software procurement and IT upgrades.

#### Notable Projects:
- Stood up a campus-wide (and transitioned to central control) a [Munkiserver](https://github.com/munkiserver/munkiserver) deployment that was used to deploy hundreds of software packages across 1,000+ Mac computers.
- Managed the IT/Media budget and equipment installation for the Schoonover Center remodel of $800,000.
- Coordinate the movement of 200+ faculty/staff computers and 150 lab machines during a multi-phase Schoonover renovation project.


EDUCATION
---------

### Ohio University, MA
- Master of Arts in Communication, Media Management, and Media Marketing
- Graduated: June 2016, Magna Cum Laude
- Attended actively 2008 - 2009; finished in 2016

### Ohio University, BSC
- Bachelor of Science
- Major: Audio-Music Production
- Minors: Music and Business
- Graduated: June 2011, Magna Cum Laude
- Took several computer science classes


COMMUNITY INVOLVEMENT
---------------------

- Rotary, Club of Athens Ohio, District 6690 Member and Strategic Planning Chair - [Aug 2023 - Present]
- Leadership Athens County 2022-2023 Cohort participant - Athens County Foundation
- Co-founder and manager of Athensworks, a co-op coworking space supporting local entrepreneurs since 2013


PDF version of this resume at [https://www.rickychilcott.com/resume.pdf](https://www.rickychilcott.com/resume.pdf).

<div style="page-break-after: always;"></div>

OPEN SOURCE
-----------

Below are a list of all of my open source contributions organized by repository and date. I
deeply believe in the importance of open source and utilizing, improving, and contributing
back to the community in a myriad of ways -- code contributions, answering questions, and
evangelizing approaches, frameworks, and libraries.

<% site.data.pr_stats.each do |repo| %>
### [<%= repo.repository_name %>](<%= repo.url %>)

<% repo.prs.each do |pr| %>
* [<%= pr.title %>](<%= pr.url %>) _contributed <%= pr.created_at.strftime("%B %Y") %>_
<% end %>

<% end %>