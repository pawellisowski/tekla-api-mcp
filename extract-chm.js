#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const CHM_FILE = './TeklaOpenAPI_Reference.chm';
const EXTRACT_DIR = './extracted-docs';

async function extractCHM() {
  console.log('Extracting CHM file...');
  
  // Create extraction directory
  if (!fs.existsSync(EXTRACT_DIR)) {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  }

  try {
    // Try using PowerShell to extract CHM (Windows built-in method)
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $chm = New-Object -ComObject "HHCtrl.OCX"
      # Alternative: use hh.exe to decompile
    `;

    // Use hh.exe to try to decompile the CHM file
    console.log('Attempting to extract using hh.exe...');
    try {
      await execAsync(`hh -decompile "${path.resolve(EXTRACT_DIR)}" "${path.resolve(CHM_FILE)}"`);
      console.log('Successfully extracted CHM using hh.exe');
    } catch (error) {
      console.log('hh.exe extraction failed, trying alternative methods...');
      
      // Try using PowerShell with COM objects
      const psCommand = `
        $ErrorActionPreference = "Stop"
        try {
          $shell = New-Object -ComObject Shell.Application
          $chm = $shell.NameSpace("${path.resolve(CHM_FILE).replace(/\\/g, '\\\\')}")
          $dest = $shell.NameSpace("${path.resolve(EXTRACT_DIR).replace(/\\/g, '\\\\')}")
          if ($chm -ne $null -and $dest -ne $null) {
            $dest.CopyHere($chm.Items(), 4)
            Write-Host "Extraction completed successfully"
          } else {
            Write-Host "Failed to access CHM or destination folder"
            exit 1
          }
        } catch {
          Write-Host "PowerShell extraction failed: $_"
          exit 1
        }
      `;
      
      await execAsync(`powershell -Command "${psCommand}"`);
      console.log('Successfully extracted CHM using PowerShell');
    }

  } catch (error) {
    console.error('CHM extraction failed:', error.message);
    console.log('Please manually extract the CHM file to the extracted-docs directory');
    console.log('You can use tools like 7-Zip, CHM Decoder, or Microsoft HTML Help Workshop');
    
    // Create a placeholder structure for development
    createPlaceholderStructure();
    return false;
  }

  return true;
}

function createPlaceholderStructure() {
  console.log('Creating placeholder structure for development...');
  
  const htmlDir = path.join(EXTRACT_DIR, 'html');
  if (!fs.existsSync(htmlDir)) {
    fs.mkdirSync(htmlDir, { recursive: true });
  }

  // Create a basic TOC file structure
  const tocContent = `<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML//EN">
<HTML>
<HEAD>
<meta name="GENERATOR" content="Microsoft&reg; HTML Help Workshop 4.1">
<!-- Sitemap 1.0 -->
</HEAD><BODY>
<OBJECT type="text/sitemap">
	<param name="Name" value="Tekla.Structures Namespace">
	<param name="Local" value="html\\T_Tekla_Structures.htm">
</OBJECT>
<UL>
	<LI> <OBJECT type="text/sitemap">
		<param name="Name" value="Tekla.Structures.Model Namespace">
		<param name="Local" value="html\\N_Tekla_Structures_Model.htm">
		</OBJECT>
	<UL>
		<LI> <OBJECT type="text/sitemap">
			<param name="Name" value="Model Class">
			<param name="Local" value="html\\T_Tekla_Structures_Model_Model.htm">
			</OBJECT>
	</UL>
</UL>
</BODY></HTML>`;

  fs.writeFileSync(path.join(EXTRACT_DIR, 'TeklaOpenAPI_Reference.hhc'), tocContent);
  console.log('Placeholder structure created');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  extractCHM().catch(console.error);
}

export { extractCHM };