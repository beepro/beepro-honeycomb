import fs from 'fs-extra';
import path from 'path';

const commands = {
  NPM: 'npm install',
  PIP: 'pip install',
  GEM: 'gem install',
  MAVEN: 'mvn clean install',
  GRADLE: 'gradle',
};

export default function detect({ dir }) {
  if (!fs.existsSync(dir)) {
    throw Error(`specified directory does not exists ${dir}`);
  }
  if (fs.existsSync(path.join(dir, 'package.json'))) {
    return commands.NPM;
  }
  if (fs.existsSync(path.join(dir, 'Gemfile'))) {
    return commands.GEM;
  }
  if (fs.existsSync(path.join(dir, 'pom.xml'))) {
    return commands.MAVEN;
  }
  if (fs.existsSync(path.join(dir, 'build.gradle'))) {
    return commands.GRADLE;
  }
  return '';
}
