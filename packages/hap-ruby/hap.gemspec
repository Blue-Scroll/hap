# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name = "bluescroll-hap"
  spec.version = "0.2.0"
  spec.authors = ["BlueScroll Inc."]
  spec.email = ["support@bluescroll.io"]

  spec.summary = "Official HAP (Human Attestation Protocol) SDK for Ruby"
  spec.description = "HAP is an open standard for verified human effort. This SDK provides tools for verifying and signing HAP claims."
  spec.homepage = "https://github.com/BlueScroll/hap"
  spec.license = "Apache-2.0"
  spec.required_ruby_version = ">= 3.0.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/BlueScroll/hap"
  spec.metadata["changelog_uri"] = "https://github.com/BlueScroll/hap/blob/main/CHANGELOG.md"

  spec.files = Dir.glob("lib/**/*") + ["README.md", "LICENSE"]
  spec.require_paths = ["lib"]

  spec.add_dependency "ed25519", "~> 1.3"
  spec.add_dependency "jwt", "~> 2.7"
  spec.add_dependency "faraday", "~> 2.7"

  spec.add_development_dependency "rspec", "~> 3.12"
  spec.add_development_dependency "rubocop", "~> 1.50"
end
