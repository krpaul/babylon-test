import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { AmmoJSPlugin } from "@babylonjs/core/Physics/Plugins/ammoJSPlugin";
import "@babylonjs/core/Physics/physicsEngineComponent";

// If you don't need the standard material you will still need to import it since the scene requires it.
import "@babylonjs/core/Materials/standardMaterial";
import { PhysicsImpostor } from "@babylonjs/core/Physics/physicsImpostor";
import { ammoModule, ammoReadyPromise } from "../externals/ammo";
import { CreateSceneClass } from "../createScene";

import * as BABYLON from '@babylonjs/core';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';

// required imports
import "@babylonjs/core/Loading/loadingScreen";
import "@babylonjs/loaders/glTF";
import "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Materials/Textures/Loaders/envTextureLoader";

import rouletteTableModel from '../../assets/glb/Roulette_Table.glb'
import roomEnvironment from "../../assets/environment/room.env"
import { Mesh } from "@babylonjs/core";

class PhysicsSceneWithAmmo implements CreateSceneClass {
    preTasks = [ammoReadyPromise];


    createScene = async (engine: Engine, canvas: HTMLCanvasElement): Promise<Scene> => {
        // This creates a basic Babylon Scene object (non-mesh)
        const scene = new Scene(engine);
    
        scene.enablePhysics(null, new AmmoJSPlugin(true, ammoModule));
    
        // This creates and positions a free camera (non-mesh)
        const camera = new ArcRotateCamera("my first camera", 0, Math.PI / 3, 10, new Vector3(0, 0, 0), scene);
    
        // This targets the camera to scene origin
        camera.setTarget(Vector3.Zero());
    
        // This attaches the camera to the canvas
        camera.attachControl(canvas, true);
    
        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
    
        // Default intensity is 1. Let's dim the light a small amount
        light.intensity = 0.7;

        new BABYLON.EnvironmentHelper( {
            skyboxTexture: roomEnvironment,
            createGround: false
        }, scene)

        // load the roulette table
        const {meshes} = await SceneLoader.ImportMeshAsync(
            "",
            "",
            rouletteTableModel,
            scene,
            undefined,
            ".glb"
        )

        meshes[0].physicsImpostor = new BABYLON.PhysicsImpostor(meshes[0], BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)

        // meshes.slice(1).forEach(m => {
        //     m.physicsImpostor = new BABYLON.PhysicsImpostor(m, BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)
        // })

        // Our built-in 'sphere' shape.
        const ball = BABYLON.MeshBuilder.CreateSphere(
            "ball",
            { diameter: 0.14, segments: 10 },
            scene
        );
    
        ball.physicsImpostor = new PhysicsImpostor(ball, PhysicsImpostor.SphereImpostor, { mass: 2, restitution: 0.8}, scene);

        const acryl_mat = new BABYLON.StandardMaterial("acryl", scene);

        acryl_mat.diffuseColor = new BABYLON.Color3(1, 0, 1);
        acryl_mat.specularColor = new BABYLON.Color3(0.5, 0.6, 0.87);
        acryl_mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
        acryl_mat.ambientColor = new BABYLON.Color3(0.23, 0.98, 0.53);

        ball.material = acryl_mat
    
        // Move the sphere upward
        ball.position.y = 5
        ball.position.x = 0.5
        ball.position.z = 0.12

        console.log(meshes)

        const innerRotation: string[] = ["Seperator"] //["InnerCircle", "Seperator", "numbers"]
        const selectedMeshes: BABYLON.AbstractMesh[] = meshes.filter((x) => innerRotation.includes(x.id))

        // selectedMeshes[0].physicsImpostor = new PhysicsImpostor(selectedMeshes[0], PhysicsImpostor.MeshImpostor, {mass: 0})
        // const connectedInnerMesh =  BABYLON.Mesh.MergeMeshes(selectedMeshes as Mesh[]) as Mesh
        // console.log(connectedInnerMesh)
        // connectedInnerMesh.physicsImpostor = new BABYLON.PhysicsImpostor(connectedInnerMesh, BABYLON.PhysicsImpostor.MeshImpostor, {mass: 0, friction: 0.25}, scene)

        scene.registerBeforeRender(() => {
            // selectedMeshes[0].rotate(BABYLON.Axis.Y, Math.PI/100, BABYLON.Space.WORLD)
            // selectedMeshes[0].physicsImpostor?.setDeltaRotation(BABYLON.Quaternion.FromEulerAngles(0, 0.03, 0))
            // console.log(selectedMeshes[0].physicsImpostor)
            
            // meshes[0].physicsImpostor?.setAngularVelocity(new BABYLON.Vector3(0, 1, 0))
            // selectedMeshes.forEach((m) => {
            //     m.rotate(BABYLON.Axis.Y, Math.PI/100, BABYLON.Space.WORLD)
            //     // m.physicsImpostor?.setAngularVelocity(new BABYLON.Vector3(0, Math.PI/100, 0))
            // })
        })
    
        return scene;
    };

    renderLoop = (): void => {
        
    }
}

export default new PhysicsSceneWithAmmo();
